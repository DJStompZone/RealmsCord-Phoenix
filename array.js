function removeEntry(entry, ary) {
    let newAry = [];
    for (let e of ary) {
        newAry.push(e);
    }
    delete newAry[(newAry.findIndex((e) => {
        return e === entry;
    }))];
    newAry = newAry.filter((e) => {
        return e;
    });
    return newAry;
}

function removeEntryByParam(param, pValue, ary) {
    let newAry = [];
    ary.forEach((e) => {
        if (e[param] != pValue) {
            newAry.push(e);
        }
    });
    return newAry;
}
module.exports = [removeEntry, removeEntryByParam]
