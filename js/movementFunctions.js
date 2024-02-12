function movementSpeed(token, type) {
	//handles speeds for non vehicles
	if (token.actor.type === "character" && type === 'land'){type = 'land-speed'}
	if (token.actor.type !== "vehicle") {
        let findSpeed = token?.actor?.system?.attributes?.speed?.otherSpeeds?.find(e => e.type == type) ?? 0;
		if(findSpeed?.total !== undefined){
			return {speed: findSpeed?.total > 0 ? findSpeed?.total : parseFloat(findSpeed?.breakdown?.match(/\d+(\.\d+)?/)[0]), type: type} //if a matching speed if found returns it.
        } else if (token.actor.system.attributes?.speed?.total !== 0 && isNaN(token.actor.system.attributes?.speed?.total) == false){
			//If the speed in question wasn't found above, and the speed total isn't 0 (happens to some npcs who's speed is stored in value instead) returns the speed total. And the type, for NPCs that may be set as something other than land.
			return {speed: parseFloat(token.actor.system.attributes?.speed?.total) ??  0, type: token.actor.system.attributes?.speed?.type ?? 'default' }
		} else {
			return {speed:Math.max([parseFloat(token.actor.system.attributes?.speed?.breakdown?.match(/\d+(\.\d+)?/)[0]), parseFloat(token.actor.system.attributes?.speed?.otherSpeeds[0]?.total), 0].filter(Number)), type: 'special' } //pulls out the speed for the value string in the event that the total was 0. In the event that both the total and value for the land speed are 0, falls back on the first other speed total, should one not exist speed will be 0.
		};
		//handles speeds for vehicles because they're different.
	} else if (token.actor.type === "vehicle"){
		return {speed:parseFloat(token.actor.system.details?.speed), type: 'default'}
	}
};

//This function handles determining the type of movment.
function getMovementType(token){
    let movementType = 'land';

    const tokenElevation = token?.document?.elevation; //Gives us a way to check if a token is flying
    //This logic gate handles flight, burrowing and swimming, if the automatic movment switching is on.
    if (game.settings.get("pf2e-dragruler", "auto")) {
        if(tokenElevation > 0) {movementType = 'fly'}; //if elevated fly
        if (tokenElevation < 0){movementType = 'burrow'}; //if below ground burrow.
        if (game.modules.get("enhanced-terrain-layer")?.active){
            let ter = canvas.terrain.terrainFromPixels(token.document.x, token.document.y)[0]
            if (ter && !(ter instanceof TokenDocument)) {
                if (['aquatic','water'].includes(ter.flags['enhanced-terrain-layer'].environment)) {
                    movementType = 'swim'
                }
            }
        }
    };

	//This logic gate handles flight and swimming, if the scene environment based movement switching is on.
	if (game.settings.get("pf2e-dragruler", "scene") === true && game.modules.get("enhanced-terrain-layer")?.active) {
		if(canvas.scene.getFlag('enhanced-terrain-layer', 'environment') === 'sky') { movementType = 'fly'}; //checks if the scene is set to have a default environment of sky. If so, uses fly speed.
		if(canvas.scene.getFlag('enhanced-terrain-layer', 'environment') === 'aquatic'){ movementType = 'swim'}; //checks if the scene is set to have a default environment of aquatic. If so, uses swim speed.
	};

    if(token.actor.flags.pf2e?.movement?.burrowing === true){ movementType = 'burrow'} //switches to burrowing if the burrow effect is applied to the actor.
    if(token.actor.flags.pf2e?.movement?.climbing === true){ movementType = 'climb'} //switches to climbing if the climb effect is applied to the actor.
    if(token.actor.flags.pf2e?.movement?.swimming === true){ movementType = 'swim'} //switches to swimming if the swim effect is applied to the actor.
    if(token.actor.flags.pf2e?.movement?.flying === true){ movementType = 'fly'} //switches to flying if the fly effect is applied to the actor.
    if(token.actor.flags.pf2e?.movement?.walking === true){ movementType = 'land'}
    return movementType;
}

//This function handles tracking how far a token has moved, allowing for drag ruler to consider movements less than a full movement speed as complete.
export function movementTracking(token){
  const movementType = getMovementType(token);
	const baseSpeed = movementSpeed(token, movementType).speed; //gets the base speed for the token, based on current movement type.
	var usedActions = 0;
	return {A1: baseSpeed, A2: baseSpeed*2, A3: baseSpeed*3, A4: baseSpeed*4, usedActions:usedActions, type:movementType}
};
