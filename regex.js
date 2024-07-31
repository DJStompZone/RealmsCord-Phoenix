function findFirstMatch(str) {
    let match = -1;
    tRegex.forEach((r) => {
        if (r.exec(str)) {
            match = tRegex.indexOf(r);
        }
    });
    return match;
}

const hexColor = new RegExp(/^#[0-9a-f]{6}$/i);
const tRegex = [/^[mc].+sleep/i, /changeTo/, /r\.player\.l/, /r\.player\.j/, /^d.+h\.[af]/];

module.expors = [findFirstMatch, hexColor, tRegex]
