const stationCodeMap: Record<string, string> = {
    kh: "København H",
    od: "Odense",
    ar: "Aarhus H",
    es: "Esbjerg",
    al: "Aalborg",
    rb: "Roskilde",
    hf: "Høje Taastrup",
    vb: "Vejle",
    pa: "Padborg",
    hmb: "Hamborg Hbf",
    ap: "Pinneberg",
}

export function removeAmpersandFromCode(code: string): string {
    const cleanCode = code.replace(/^&/, '').toLowerCase();
    return stationCodeMap[cleanCode] || cleanCode;
}