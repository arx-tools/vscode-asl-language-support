// the human readable pieces of the hover texts. the wiki is the reference for every command, the
// summaries below are only for the ones that are used the most.

/**
 * The url of the command catalogue of the wiki.
 */
export const COMMAND_WIKI_URL = 'https://wiki.arx-libertatis.org/Script:Commands'

/**
 * The url of the language overview of the wiki.
 */
export const LANGUAGE_WIKI_URL = 'https://wiki.arx-libertatis.org/Arx_scripting_language'

/**
 * The short summaries of the most used commands.
 */
const COMMAND_DOCS = new Map<string, string>([
  ['accept', 'Ends the current event handler with a success result.'],
  ['refuse', 'Ends the current event handler with a refusal result.'],
  ['return', 'Returns from a `gosub` to the command after the call.'],
  ['nop', 'Does nothing.'],
  ['if', 'Runs the next block (or the next statement) when the comparison is true.'],
  ['else', 'Runs the next block when the previous `if` did not take its own block.'],
  ['random', 'Takes the next block with the given percentage chance, between 0 and 100.'],
  ['ifvisible', 'Takes the next block when the entity is visible.'],
  ['ifexistinternal', 'Takes the next block when the entity exists internally.'],
  ['set', 'Assigns a value to a variable. The first assignment creates the variable.'],
  ['unset', 'Removes a variable.'],
  ['inc', 'Increments a number variable.'],
  ['dec', 'Decrements a number variable.'],
  ['add', 'Adds a value to a number variable.'],
  ['sub', 'Subtracts a value from a number variable.'],
  ['mul', 'Multiplies a number variable with a value.'],
  ['div', 'Divides a number variable with a value.'],
  ['goto', 'Jumps to a `>>label` of the same script.'],
  ['gosub', 'Calls a `>>label` of the same script and continues after it on `return`.'],
  [
    'sendevent',
    'Queues an event for the given entities. The `-g`, `-z` and `-r` flags select the receivers by group, zone or radius, and `-f`, `-i`, `-n` narrow them to FIX, ITEM and NPC entities.',
  ],
  ['speak', 'Plays a voice line with `-c` for the text key. The rest of the line runs when the speech ends.'],
  ['herosay', 'Shows a subtitle line for the player.'],
  ['playanim', 'Plays an animation. With `-e` the rest of the line runs when the animation ends.'],
  ['loadanim', 'Loads an animation so `playanim` can use it.'],
  ['play', 'Plays a sound file.'],
  ['settarget', 'Sets the target of the entity.'],
  ['setname', 'Sets the displayed name of the entity, which can be a `[localization key]`.'],
  ['objecthide', 'Shows or hides the entity.'],
  [
    'halo',
    'Sets the halo (glow) of the entity; the flags pick the mode and the arguments give the colour and the strength.',
  ],
  ['setnpcstat', 'Changes a stat of an NPC, for example the life or the mana.'],
  ['setmaterial', 'Sets the material of the mesh of the entity.'],
  ['setdurability', 'Sets the durability of an item.'],
  ['setlife', 'Sets the life of the entity.'],
  ['setscale', 'Sets the scale of the entity, in percent.'],
  ['setweight', 'Sets the weight of an item.'],
  ['setprice', 'Sets the price of an item.'],
  ['setfood', 'Sets how much food an item gives.'],
  ['setequip', 'Equips or unequips an item.'],
  ['setgroup', 'Sets the group of the entity, which `sendevent -g` and the `isgroup` check use.'],
  ['setinteractivity', 'Sets the interactivity of the entity to `on`, `off` or `hide`.'],
  ['setevent', 'Enables or disables an event of the entity. Only the `DISABLE_*` events can be turned off.'],
  ['setmainevent', 'Sets the periodic `main` event of the entity.'],
  ['usemesh', 'Replaces the mesh of the entity.'],
  ['teleport', 'Moves the entity to a position.'],
  ['destroy', 'Destroys the entity.'],
  ['move', 'Moves the entity by the given offset.'],
  ['rotate', 'Rotates the entity.'],
  [
    'inventory',
    'Runs an inventory subcommand: `add`, `addmulti`, `addfromscene`, `playeradd`, `playeraddmulti`, `playeraddfromscene`, `create`, `destroy`, `open`, `close` or `skin`.',
  ],
  [
    'behavior',
    'Sets the behaviour of an NPC: `friendly`, `move_to`, `wander_around`, `look_for`, `go_home`, `guard`, `flee`, `hide`, `none`, `stack`, `unstack` or `unstackall`.',
  ],
  [
    'tweak',
    'Changes the skin, the icon or a mesh part of the entity: `skin`, `icon`, `remove`, `head`, `torso`, `legs`, `all`, `upper`, `lower` or `up_lo`.',
  ],
  ['spawn', 'Creates a `npc` or an `item` entity.'],
  ['invulnerability', 'Turns the invulnerability of the entity on or off.'],
  ['setplayercollision', 'Turns the collision between the player and the entity on or off.'],
  ['setplayercontrols', 'Turns the player controls on or off.'],
  ['linkobjtome', 'Attaches an object to the entity.'],
  ['attach', 'Attaches an object to the entity.'],
  ['detach', 'Detaches an object from the entity.'],
  ['cinemascope', 'Turns the cinematic bars on or off.'],
  ['worldfade', 'Fades the screen to or from a colour.'],
  ['quake', 'Shakes the screen.'],
  ['ambiance', 'Sets the ambient sound of the level.'],
  ['quest', 'Updates the quest log.'],
  ['note', 'Adds a note to the journal.'],
  ['popup', 'Shows a popup message.'],
  ['mapmarker', 'Places a marker on the map.'],
  ['keyringadd', 'Adds a key to the key ring.'],
  ['revive', 'Revives a dead NPC.'],
  ['poison', 'Poisons the entity.'],
  ['eatme', 'Consumes a food item.'],
  ['repair', 'Repairs an item.'],
  ['showvars', 'Prints the variables of the entity to the console (debug).'],
  ['showglobals', 'Prints the global variables to the console (debug).'],
  ['showlocals', 'Prints the local variables of the entity to the console (debug).'],
])

/**
 * The subcommands of the commands that take a worded argument.
 */
const SUBCOMMANDS = new Map<string, string[]>([
  [
    'inventory',
    [
      'add',
      'addmulti',
      'addfromscene',
      'playeradd',
      'playeraddmulti',
      'playeraddfromscene',
      'create',
      'destroy',
      'open',
      'close',
      'skin',
    ],
  ],
  [
    'behavior',
    [
      'friendly',
      'move_to',
      'wander_around',
      'look_for',
      'go_home',
      'guard',
      'flee',
      'hide',
      'none',
      'stack',
      'unstack',
      'unstackall',
    ],
  ],
  ['tweak', ['skin', 'icon', 'remove', 'head', 'torso', 'legs', 'all', 'upper', 'lower', 'up_lo']],
  ['spawn', ['item', 'npc']],
])

/**
 * Returns the short summary of a command.
 */
export function getCommandSummary(command: string): string | null {
  return COMMAND_DOCS.get(command) ?? null
}

/**
 * Returns the subcommands of a command.
 */
export function getSubcommands(command: string): string[] {
  return SUBCOMMANDS.get(command) ?? []
}
