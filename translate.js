const {loc} = require('./translation.json')

function parseLocalText(itxt){
  let inp = itxt.split('%').join('').split('.').join('_').replace('death_', '')
  if (inp.split(" ").length === 1 && Object.keys(loc).includes(inp)){return loc[inp]}
  return inp.split(" ").map(itm => loc[itm]||itm).join(" ")
}
function playerDied(userDied) {
    return `**${userDied.player}** ${parseLocalText(userDied.cause)}`.replace(/KLR/, parseLocalText(userDied.killer))
}
module.exports = {playerDied: playerDied, parseLocalText: parseLocalText, loc: loc}
