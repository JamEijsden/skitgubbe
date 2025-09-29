import { v4 as uuidv4 } from 'uuid';

const MAX_PLAYERS = 6;
const rooms = new Map();
const suits = ['♥', '♦', '♠', '♣'];
const ranks = ['3', '4', '5', '6', '7', '8', '9', 'J', 'Q', 'K', 'A', '2', '10']; // 2,10 are specials

function createDeck() {
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({ id: uuidv4(), suit: s, rank: r });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rankOrder(rank) {
  return ranks.indexOf(rank);
}

function suitOrder(suit) {
  return suits.indexOf(suit);
}

function canPlayOn(top, card) {
  if (!top) return true;
  if (card.rank === '2') return true; // 2 may always be played
  if (card.rank === '10') return true; // 10 clears
  if (top.rank === '2') return true; // after 2, any card may be played
  return rankOrder(card.rank) >= rankOrder(top.rank);
}

function createRoom(name, hostId = null) {
  const id = uuidv4().slice(0, 8);
  const room = {
    id, name: name || 'Room ' + id,
    players: [], hostId,
    started: false,
    stock: [], pile: [], turn: 0,
    lastRanks: [], // track last ranks to detect 4 of a kind
    loser: null
  };
  rooms.set(id, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function listRooms() {
  return Array.from(rooms.values())
    .filter(r => !r.started && r.players.length < MAX_PLAYERS)
    .map(r => ({ id: r.id, hostId: r.hostId, name: r.name, count: r.players.length, players: r.players.map(p => p.name) }));
}

function joinRoom(roomId, socketId, playerName) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  if (room.started) throw new Error('Game already started');
  if (room.players.length >= MAX_PLAYERS) throw new Error('Room full');
  const player = { id: socketId, name: playerName || 'Player', hand: [], up: [], down: [], hasSwapped: false };
  room.players.push(player);
  if (!room.hostId) room.hostId = socketId;
  return player;
}

function leaveRoom(roomId, socketId) {
  for (const [id, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) rooms.delete(id);
      else if (room.hostId === socketId) room.hostId = room.players[0].id;
      break;
    }
  }
}

function deal(room) {
  room.stock = createDeck();
  for (const p of room.players) {
    p.down = room.stock.splice(0, 3);
    p.up = room.stock.splice(0, 3);
    p.hand = room.stock.splice(0, 3);
  }
}

function startGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  if (room.started) throw new Error('Already started');
  if (room.players.length < 2) throw new Error('Need 2+ players');
  deal(room);
  room.started = true;
  room.turn = 0;
  room.pile = [];
  room.lastRanks = [];
  room.loser = null;
  room.stock = [];
  room.stockCount = 0;

}

function drawToThree(room, player) {
  while (room.stock.length > 0 && player.hand.length < 3) {
    player.hand.push(room.stock.shift());
  }
}

function currentPlayer(room) {
  return room.players[room.turn % room.players.length];
}

function advanceTurn(room, keep = false) {
  if (!keep) room.turn = (room.turn + 1) % room.players.length;
  // Skip finished players (no cards anywhere)
  let guard = 0;
  while (guard++ < 10) {
    const p = currentPlayer(room);
    if (p && p.hand.length === 0 && p.up.length === 0 && p.down.length === 0) {
      room.players.splice(room.turn, 1);
      if (room.players.length === 0) break;
      if (room.turn >= room.players.length) room.turn = 0;
    } else break;
  }
  if (room.players.length === 1) {
    room.loser = room.players[0].name;
  }
}

function zoneFor(player, cardId) {
  if (player.hand.find(c => c.id === cardId)) return 'hand';
  if (player.up.find(c => c.id === cardId)) return 'up';
  if (player.down.find(c => c.id === cardId)) return 'down';
  return null;
}

function removeCardsFromZone(player, zone, ids) {
  const src = player[zone];
  const removed = [];
  for (const id of ids) {
    const idx = src.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Card not in your ' + zone);
    removed.push(src.splice(idx, 1)[0]);
  }
  return removed;
}

function validateSameRank(cards) {
  if (cards.length === 0) throw new Error('No cards');
  const r = cards[0].rank;
  for (const c of cards) if (c.rank !== r) throw new Error('Play cards of one rank');
  return r;
}

function topCard(room) {
  return room.pile[room.pile.length - 1] || null;
}

function clearPile(room) {
  room.pile = [];
  room.lastRanks = [];
}

function tryFourClear(room) {
  if (room.pile.length < 4) return false;
  const lastFour = room.pile.slice(-4).map(c => c.rank);
  if (lastFour.every(r => r === lastFour[0])) {
    clearPile(room);
    return true;
  }
  return false;
}

function playCards(roomId, socketId, cardIds) {
  const room = rooms.get(roomId);
  if (!room || !room.started) throw new Error('Game not started');
  const player = currentPlayer(room);
  if (!player || player.id !== socketId) throw new Error('Not your turn');

  // Determine zone: must all be from the same zone
  console.log(cardIds);
  cardIds.map(id => {
    console.log('zoneFor', id, zoneFor(player, id));
    return zoneFor(player, id);
  })
  const zones = new Set(cardIds.map(id => zoneFor(player, id)));
  if (zones.has(null) || zones.size !== 1) throw new Error('Play from one zone only');
  const zone = [...zones][0];

  // If playing from down, must be exactly one card (blind)
  if (zone === 'down' && cardIds.length !== 1) throw new Error('Play exactly one face-down card');

  const cards = removeCardsFromZone(player, zone, cardIds);

  // If playing from down, reveal the card and verify legality; if illegal, pick up pile + the card
  if (zone === 'down') {
    const card = cards[0];
    if (!canPlayOn(topCard(room), card)) {
      // must pick up
      player.hand.push(card, ...room.pile.splice(0));
      drawToThree(room, player);
      advanceTurn(room);
      return;
    } else {
      // legal
    }
  } else {
    // From hand or up: must be same rank
    const rank = validateSameRank(cards);
    // All cards must be legal on current top
    for (const c of cards) {
      if (!canPlayOn(topCard(room), c)) {
        // Undo
        player[zone].push(...cards);
        throw new Error('Illegal play on current pile');
      }
    }
  }

  // Place cards on pile
  room.pile.push(...cards);

  const justRank = cards[0].rank;
  let cleared = false;
  let keepTurn = false;

  if (justRank === '10') {
    clearPile(room);
    cleared = true;
    keepTurn = true; // same player starts new pile
  } else if (justRank === '2') {
    keepTurn = true;
    // reset: next player may play any card; turn still passes
  } else if (tryFourClear(room)) {
    cleared = true;
    keepTurn = true; // same player continues after clear
  }

  // Draw to 3 from stock if player still has hand cards zone
  if (zone === 'hand') drawToThree(room, player);

  // Check if player finished (no cards in any zone)
  if (player.hand.length === 0 && player.up.length === 0 && player.down.length === 0) {
    // Remove player immediately; if only one left, they are loser
    const idx = room.players.findIndex(p => p.id === player.id);
    if (idx !== -1) room.players.splice(idx, 1);
    if (room.players.length === 1) room.loser = room.players[0].name;
    if (cleared) {
      // after a clear, next lead is current turn index (already points to next player);
      // but we removed current player, so keep as is
    }
    return;
  }

  // Advance turn
  advanceTurn(room, keepTurn);
}

function getPlayerIdWithLowestCard(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const playerCards = room.players.map(p => {
    if (!p.hand || !p.hand.length) {
      return { playerId: p.id, rank: Infinity, suit: Infinity };
    }

    // Find lowest card for this player
    const lowestCard = p.hand.reduce((min, c) => {
      const r = rankOrder(c.rank);
      const s = suitOrder(c.suit);
      const minR = rankOrder(min.rank);
      const minS = suitOrder(min.suit);

      if (r < minR) return c;
      if (r === minR && s < minS) return c;
      return min;
    }, p.hand[0]);

    return {
      playerId: p.id,
      rank: rankOrder(lowestCard.rank),
      suit: suitOrder(lowestCard.suit)
    };
  });

  // Sort by rank first, then suit
  playerCards.sort((a, b) => a.rank === b.rank ? a.suit - b.suit : a.rank - b.rank);

  // The first element has the lowest card
  return playerCards[0].playerId;
}

function pickupPile(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room || !room.started) throw new Error('Game not started');
  const player = currentPlayer(room);
  if (player.id !== socketId) throw new Error('Not your turn');
  // pick up pile
  player.hand.push(...room.pile.splice(0));
  drawToThree(room, player);
  advanceTurn(room);
}

function swapCards(roomId, socketId, swaps) {
  // swaps: [{ handId, upId }] - swap between hand and up before any play
  const room = rooms.get(roomId);
  if (!room || !room.started) throw new Error('Game not started');
  const player = room.players.find(p => p.id === socketId);
  if (!player) throw new Error('Player not found');
  if (room.pile.length > 0) throw new Error('Swaps only before first play');
  for (const s of swaps || []) {
    const hi = player.hand.findIndex(c => c.id === s.handId);
    const ui = player.up.findIndex(c => c.id === s.upId);
    if (hi === -1 || ui === -1) throw new Error('Invalid swap');
    const tmp = player.hand[hi];
    player.hand[hi] = player.up[ui];
    player.up[ui] = tmp;
  }
  player.hasSwapped = true;
}

function getStateFor(roomId, startingPlayerId = null) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if(startingPlayerId) {
    const playerIndex = room.players.map(p => p.id).indexOf(startingPlayerId) !== -1;
    console.log('Found playerIndex for startingPlayerId', startingPlayerId, playerIndex);
    room.turn = playerIndex !== -1 ? playerIndex : room.turn;
  }
  startingPlayerId = startingPlayerId || (room.players.length ? room.players[room.turn % room.players.length].id : null);
  return {
    id: room.id,
    name: room.name,
    started: room.started,
    hostId: room.hostId,
    swapPhaseOver: room.players.every(p => p.hasSwapped),
    players: room.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      counts: { hand: p.hand.length, up: p.up.length, down: p.down.length },
      isTurn: room.turn % room.players.length === idx
    })),
    pileTop: room.pile.length ? room.pile[room.pile.length - 1] : null,
    pileCount: room.pile.length,
    stockCount: room.stock.length,
    turnPlayerId: startingPlayerId,
    loser: room.loser
  };
}


function getPrivateFor(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const me = room.players.find(p => p.id === socketId);
  if (!me) return null;
  return {
    roomId: room.id,
    playerId: socketId,
    swapped: me.hasSwapped,
    me: { hand: me.hand, up: me.up, down: me.down }
  };
}
export {
  createRoom, joinRoom, leaveRoom, listRooms, startGame,
  playCards, pickupPile, swapCards,
  getStateFor, getPrivateFor, getRoom, getPlayerIdWithLowestCard
};
