import { NS, AutocompleteData } from "@ns";

/** @param {NS} ns **/
export async function main(ns: NS) {
    // Asegúrate de tener Formulas.exe comprado
    if (!ns.fileExists("Formulas.exe", "home")) {
        ns.tprint("❌ Necesitas Formulas.exe para este script");
        return;
    }

    const TOP = ns.args.length > 0 ? Number(ns.args[0]) || 5 : 5; // por defecto top 5

    // Función recursiva para escanear toda la red
    function scanNetwork(server:string, visited: Set<string> = new Set()) {
        visited.add(server);
        for (let neighbor of ns.scan(server)) {
            if (!visited.has(neighbor)) {
                scanNetwork(neighbor, visited);
            }
        }
        return [...visited];
    }

    const servers = scanNetwork("home");
    const player = ns.getPlayer();
    let rentableServers = [];

    for (const host of servers) {
        if (host === "home") continue;

        const server = ns.getServer(host);

        // Necesitas root access para hackear
        if (!server.hasAdminRights) continue;

        // Debe tener dinero
        if ((server.moneyMax??0) <= 0) continue;

        // Calcula chance de hackeo
        const chance = ns.formulas.hacking.hackChance(server, player);
        if (chance < 0.25) continue; // ignora si la chance es muy baja

        // Calcula cuánto dinero da un hilo de hack
        const percent = ns.formulas.hacking.hackPercent(server, player);
        const moneyPerHack = (server.moneyMax??0) * percent;

        // Tiempo del hack
        const time = ns.formulas.hacking.hackTime(server, player) / 1000; // en segundos

        // Tasa de ganancia (dinero/segundo)
        const rate = (moneyPerHack * chance) / time;

        rentableServers.push({
            host,
            rate,
            chance,
            time,
            moneyPerHack
        });
    }

    // Ordenar por rentabilidad descendente
    rentableServers.sort((a, b) => b.rate - a.rate);

    if (rentableServers.length === 0) {
        ns.tprint("❌ No encontré servidores rentables todavía...");
        return;
    }

    ns.tprint(`💰 Top ${TOP} servidores más rentables:`);
    for (const server of rentableServers.slice(0, TOP)) {
        ns.tprint(
            `📌 ${server.host} | ${ns.formatNumber(server.rate)}/s | ` +
            `Chance: ${(server.chance * 100).toFixed(1)}% | ` +
            `Hack: ${ns.formatNumber(server.moneyPerHack)} | ` +
            `Tiempo: ${server.time.toFixed(1)}s`
        );
    }
}
