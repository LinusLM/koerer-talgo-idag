
const TALGO_FORMATION = [
    "BPD", "APT", "AP", "BPH",
    "BP", "BPT", "BP", "BPT",
    "BP", "BP", "BPT", "BPD"
];

function countUnits(arr: string[]) {
    return arr.reduce<Record<string, number>>((acc, unit) => {
        acc[unit] = (acc[unit] || 0) + 1;
        return acc;
    }, {});
}

export function isTalgo(train: any) {
    // Accept different snapshot shapes: `Routes` or `routes`, and unit fields
    const routeArray = train.Routes ?? train.routes ?? [];
    const units = (routeArray ?? [])
        .map((r: any) => r?.UnitType ?? r?.unitType ?? "")
        .filter((u: string) => !!u);

    if (units.length === 0) return false;

    const requiredCounts = countUnits(TALGO_FORMATION);
    const actualCounts = countUnits(units);

    return Object.entries(requiredCounts).every(
        ([unit, count]) => (actualCounts[unit] || 0) >= count
    );
}