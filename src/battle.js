import config from './config';
import connection from './connection';


class Battle {
  constructor(bid) {
    // battle ID
    console.log('battle constructed with id', bid);
    this.bid = bid;
    // what does state look like? WELL. Check out these properties:
    // 'rqid': the request ID. ex. '1' for the first turn, '2' for the second, etc.
    //         These don't match up perfectly with turns bc you may have to swap
    //         out pokemon if one dies, etc.
    //  'side':
    //    'name': your name
    //    'id': either 'p1' or 'p2'
    //    'pokemon': [Pokemon]      (6 of them. they're the pokemon on yr side)
    //  'active':
    //    'moves': [Move]           (the 4 moves of your active pokemon)
    //
    //   Move is an object with these properties:
    //   'move': the move name (ex.'Fake Out')
    //   'id': the move ID (ex. 'fakeout')
    //   'pp': how many PP you currently have
    //   'maxpp': the max PP for this move
    //   'target': target in options (ex. 'normal')
    //   'disabled': boolean for whether this move can be used.
    //
    //   Pokemon look like this:
    //   'ident': ex. 'p1: Wormadam'
    //   'details': ex. 'Wormadam, L83, F'
    //   'condition': ex. '255/255'
    //   'hp': current HP
    //   'maxhp': maximum HP
    //   'active': boolean, true if pokemon is currently active
    //   'stats':
    //     'atk': attack
    //     'def': defense
    //     'spa': special attack
    //     'spd': special defense
    //     'spe': speed
    //   'moves': Array of move IDs
    //   'baseAbility': the ability of the Pokemon (ex. 'overcoat')
    //   'item' the Pokemon's held item (ex. 'leftovers')
    //   'pokeball': what kind of pokeball the Pokemon was caught with
    //   'canMegaEvo': Boolean for whether this Pokemon can mega-evolve
    //
    //
    // data = {};

    // model of the opponent's 6 pokemon
    this.opponent = [];

    // this.state.activemon = () => {
    //   return this.state.side.pokemon.filter( (mon) => {
    //     return mon.active;
    //   });
    // }();

    const AI = require(config.botPath);
    this.bot = new AI();
    // listener.subscribe('title', saveTitle);
    // listener.subscribe('request', onRequest);
  }

  myBot() {
    return this.bot;
  }

  // saveTitle(args) {
  //   [battleId, title] = args;
  //   battles[battleId].title = title;
  // }
  handle(type, message) {
    switch (type) {
    case 'request':
      this.handleRequest(message);
      break;
    case 'switch':
      this.handleSwitch(message);
      break;
    default:
      break;
    }
  }

  handleSwitch(message) {
    console.log('switch called.', message);
    // p2a: Slurpuff|Slurpuff, L77, M|100/100
    const [pokemonsname, details, condition] = message;


    const parsedMon = this.processMon({
      details,
      condition
    });

    // warning, this might overwrite our opponent
    this.opponent[pokemonsname] = parsedMon;

    this.opponentActive = parsedMon;
    console.log('opponent data:', this.opponentActive, this.opponent);
  }

  handleRequest(json) {
    const data = JSON.parse(json);
    // this.state = data;
    data.opponent = this.opponent;

    console.dir(data);

    // @TODO this is bad, you should wait for a 'start' message instead!
    if (!data.rqid) {
      // this is not a request, just data.
      return;
    }

    // do what it says.
    if (data.wait) {
      return;
    }

    // some cleaner methods
    data.side.pokemon.map( this.processMon );

    // console.log('would have moved.');
    const move = this.myBot().onRequest(data);
    const msg = `${this.bid}|${move}|${data.rqid}`;
    connection.send( msg );
  }

  processMon(mon) {
    console.log('processMon called with ', mon);
    const deets = mon.details.split(', ');
    mon.type = deets[0];
    mon.level = parseInt(deets[1].substr(1), 10);
    mon.gender = deets[2] || 'M';
    mon.dead = false;
    mon.conditions = [];

    const hps = mon.condition.split('/');
    if (hps.length === 2) {
      mon.hp = parseInt(hps[0], 10);
      const maxhpAndConditions = hps[1].split(' ');
      mon.maxhp = parseInt(maxhpAndConditions[0], 10);

      if (maxhpAndConditions.length > 1) {
        mon.conditions = maxhpAndConditions.slice(1);
      }
    } else if (mon.condition === '0 fnt') {
      mon.dead = true;
      mon.hp = 0;
      mon.maxhp = 0;
    } else {
      console.error('weird condition:', mon.condition);
    }
    return mon;
  }
}

export default Battle;