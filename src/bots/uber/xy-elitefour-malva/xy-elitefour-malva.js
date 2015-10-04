/**
 *
 *
 */

import AI from '../../../ai';
// import Damage from '../../lib/damage';
import typechart from '../../../lib/typechart';

/**
 * This is used in calculating randomness. If the exponent is 1, you'll end
 * up using flat weight numbers; at higher exponents you will more often favor
 * the moves that you decided you're more likely to use. Ex. if we have a super
 * effective move, we want the chance that we'll use it to be REALLY high.
 *
 */
const randomnessExponent = 2;

const weights = {
  effectiveness: {
    weight: 10,
    // check typechart for all possibilities
    value: (val) => {
      return {
        0: 0,
        0.5: 1,
        1: 2,
        2: 10,
        4: 20
      }[val];
    }
  },
  // boolean
  stabby: {
    weight: 10,
  },
  // this # is the chance that the effect will happen (ex. 10% or 100%)
  status: {
    weight: 10,
  },
  unboost: {
    weight: 10,
  },
  prioritykill: {
    weight: 15,
  },
  recoil: {
    weight: -5
  },
  // for whatever random stuff we wanna throw in here.
  bonus: {
    weight: 1
  }

};

export default class Malva extends AI {
  constructor() {
    super();

    this.lastMove = null;
    this.weights = weights;
    this.randomnessExponent = randomnessExponent;
  }

  onRequest(state) {
    const fitness = {};
    const totalFitness = {};
    state.myActive.moves.forEach( (move) => {
      fitness[move.id] = {};

      console.log(state.activeOpponent);
      // favor super-effective moves, disfavor ineffective / weak moves
      fitness[move.id].effectiveness =
        state.activeOpponent.types.map( (opponentType) => {
          return typechart[move.type][opponentType];
        }).reduce( (prev, curr) => {
          return Math.max(prev, curr);
        });

      fitness[move.id].stabby = !!state.myActive.types.indexOf(move.type);

      // favor unboosting moves on non-unboosted opponents,
      // as long as we didn't just try this move.
      if (move.category === 'Status' && move.id !== this.lastMove &&
      move.boosts) {
        ['atk', 'spa', 'spd', 'spe', 'def'].forEach( (type) => {
          if (!move.boosts[type]) return;

          if ( state.activeOpponent.boosts && state.activeOpponent.boosts[type] &&
          state.activeOpponent.boosts[type] < 0 ) return;

          // OK, we're in the clear here.
          fitness[move.id].unboost = true;
        });
      }

      // favor status moves on non-statused opponents,
      // as long as we didn't just try this move.
      if (move.secondary && move.id !== this.lastMove) {
        if (!state.activeOpponent.statuses ||
          !state.activeOpponent.statuses.indexOf(move.secondary.status) >= 0) {
          fitness[move.id].status = move.secondary.status.chance;
        }
      }
      // @TODO check volatileStatus for moves like Confuse Ray

      // priority moves
      if (move.priority > 0 && state.activeOpponent.hp < 25) {
        fitness[move.id].prioritykill = true;
      }

      // unfavor moves that leave me dead
      // @TODO I don't like that hppct and active opponent's hp are both percent fields
      if (move.recoil && state.myActive.hppct < 33) {
        fitness[move.id].recoil = true;
      }

      if (move.id === 'flail' && state.myActive.hppct < 33) {
        fitness[move.id].bonus = 20;
      }

      totalFitness[move.id] = this.sumFitness(fitness[move.id]);
    });

    // pick a move from total fitness
    const myMove = this.pickMoveByFitness(totalFitness);
    return myMove;
  }

  sumFitness(obj) {
    let sum = 0;
    for (const key in obj) {
      if (weights[key]) {
        // run the value function if it exists;
        // else, convert the value to a number and use that.
        const value = weights[key].value
          ? weights[key].value(obj[key])
          : +obj[key];

        sum = sum + weights[key].weight * value;
      }
    }
    return sum;
  }

  pickMoveByFitness(moveArr) {
    let total = 0;
    const weighted = {};
    for (const move in moveArr) {
      if ({}.hasOwnProperty.call(moveArr, move)) {
        weighted[move] = moveArr[move] >= 0
          ?  Math.pow(moveArr[move], randomnessExponent)
          : 0;
        total = total + weighted[move];
      }
    }
    const myVal = Math.random() * total;
    let accum = 0;
    for (const move in weighted) {
      if ({}.hasOwnProperty.call(weighted, move)) {
        accum = accum + weighted[move];
        console.log(accum, myVal);
        if (accum > myVal) return move;
      }
    }
    // something went wrong
    return false;
  }


  getTeam() {
    // NOTES:
    // 'curse' is weird, might want to check target's ghost-ness.
    // 'earthquake': def. use if the opponent used Dig
    return `
  Pyroar
Ability: Rivalry
- Hyper Voice
- Noble Roar
- Flamethrower
- Wild Charge

Torkoal
Ability: White Smoke
- Curse
- Flame Wheel
- Stone Edge
- Earthquake

Chandelure
Ability: Flame Body
- Flamethrower
- Confuse Ray
- Confide
- Shadow Ball

Talonflame
Ability: Flame Body
- Quick Attack
- Brave Bird
- Flare Blitz
- Flail
`;
  }

}