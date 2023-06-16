import {movementTracking} from "./movementFunctions.js"

function conditionFacts(tokenConditions, conditionSlug) {
	return tokenConditions.find(e => e.slug == conditionSlug)
}

//determines how many actions a token should start with.
function actionCount(token) {
    let num_actions = 3 //Set the base number of actions to the default 3.
    const conditions = token.actor.conditions.filter(a=>a.active);

    if (conditionFacts(conditions, "immobilized") || conditionFacts(conditions, "paralyzed")
        || conditionFacts(conditions, "petrified") || conditionFacts(conditions, "unconscious")) {
        return 0;
    }
    let stunned = conditionFacts(conditions, "stunned");
    let slowed = conditionFacts(conditions, "slowed");
    let quickened = conditionFacts(conditions, "quickened");
    if (stunned || slowed) {
            num_actions -= Math.max( (slowed?.value ?? 0), (stunned?.value ?? 0) )
    }
    if (quickened) {
        num_actions += 1;
    }

    return num_actions < 0 ? 0 : num_actions
};


Hooks.once("init", () => {
	//Wait until the game is initialized, then register the settings created previously.
	game.settings.register("pf2e-dragruler", "offTurnMovement", {
	name: game.i18n.localize("pf2e-dragruler.settings.offTurnMovement.name"),
	hint: game.i18n.localize("pf2e-dragruler.settings.offTurnMovement.hint"),
	scope: "world",
	config: true,
	type: Boolean,
	default: false
})
});
Hooks.once("dragRuler.ready", (SpeedProvider) => {
	class PF2eSpeedProvider extends SpeedProvider {
	  //Registers colours for up to four movement actions so colours can be customized for them, and sets defaults
	  get colors(){
	  return [
	    {id: "FirstAction", default: 0x3222C7},
	    {id: "SecondAction", default: 0xFFEC07},
	    {id: "ThirdAction", default: 0xC033E0},
	    {id: "FourthAction", default: 0x1BCAD8}
	  ]
	  };
	  // Get the distance for each movement interval to give to drag ruler
	  getRanges(token){
	  var numactions = actionCount(token); //Use the actionCount function to determine how many actions that token gets each round.
	  var movement = movementTracking(token); //Use the movementTracking function to get how far each movement range should be.
	  const ranges = []; //create blank array to store the ranges in.

	  if (numactions > 0 && movement.A1 > 0){
	  //Set the ranges for each of our four actions to be given to the drag ruler.
	  ranges.push({range: movement.A1, color: "FirstAction"},{range: movement.A2, color: "SecondAction"}, { range: movement.A3, color: "ThirdAction"},{range: movement.A4, color: "FourthAction"});
	  //Remove ranges from the function until only the ranges equal to the number of legal actions remain.
	   for (var i = numactions, len=ranges.length; i<len; i++){
	    ranges.pop();
	   };
	  } else {ranges.push({range: 0, color: "FirstAction"})}; //Since ranges is empty if you've got no actions add a range for the first action of 0.
	  return ranges;
	  };
	  };
// When dragruler is ready to go give it all the PF2 specific stuff
	dragRuler.registerModule("pf2e-dragruler", PF2eSpeedProvider) //register the speed provider so its selectable from the drag ruler configuration.
});

Hooks.on('updateCombat', () => {
	if(game.user.isGM && game.settings.get("drag-ruler", "enableMovementHistory") && game.settings.get("pf2e-dragruler", "offTurnMovement")){
		const combat = game.combats.active; //set the current combat
		if(combat?.turns.length > 0){
		 const previousCombatant = combat.turns[(combat.turn - 1) < 0 ? (combat.turns.length - 1) : (combat.turn - 1)];
		 const nextCombatant = combat.turns[combat.turn]; //find the next combatant
		 	if(nextCombatant?.flags?.dragRuler){
			 dragRuler.resetMovementHistory(combat, nextCombatant._id); //if movement history exists, clears it for the next combatant prior to acting. Gives a clean slate for the new turn, important for clearing out off turn movement.
		 	};
			if(previousCombatant?.flags?.dragRuler){
			 dragRuler.resetMovementHistory(combat, previousCombatant._id); //if movement history exists, clears it for the next combatant prior to acting. Gives a clean slate for the new turn, important for clearing out off turn movement.
		 	};
		};
 };
});
