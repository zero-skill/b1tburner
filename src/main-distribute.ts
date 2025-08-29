import { NS, AutocompleteData } from "@ns";

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    if (!ns.fileExists("Formulas.exe", "home")) {
        ns.tprint("❌ Necesitas Formulas.exe para este script");
        return;
    }
    const calculated_target = ns.getHostname();
    // ns.tprint(`calculated_target = ${calculated_target}`)
    const target = (ns.args[0] as string) ?? calculated_target;
    const player = ns.getPlayer();

    // Workers a copiar
    const workerScripts = ["worker-hack.js", "worker-grow.js", "worker-weaken.js"];

    // Escanear toda la red
    function scanNetwork(server: string, visited: Set<string> = new Set()) {
        visited.add(server);
        for (const neighbor of ns.scan(server)) {
            if (!visited.has(neighbor)) scanNetwork(neighbor, visited);
        }
        return [...visited];
    }

    const servers: string[] = scanNetwork("home")
        .filter(s => s !== "home" && ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0);
    servers.unshift("home"); // incluir home también

    // ns.tprint(servers)
    // ["home","n00dles","foodnstuff","sigma-cosmetics","zer0","max-hardware","avmnite-02h","joesguns","CSEC","I.I.I.I","hong-fang-tea","harakiri-sushi","iron-gym","nectar-net"]

    // Copiar workers a todos los servidores
    for (const s of servers) {
        let copied = ns.scp(workerScripts, s);
        // ns.tprint(`copied workerStripts to ${s} :   ${copied}`)
    }

    // Configuración del batch
    const hackFraction = 0.05; // roba 5% por lote
    const delayGap = 200;

    while (true) {

        const srv = ns.getServer(target);
        const chance = ns.formulas.hacking.hackChance(srv, player);
        if (chance < 0.6) {
            ns.tprint(`⚠️ Chance muy baja en ${target}`);
            // break;
        }

        // --- Cálculos de threads ---
        const hackPercent = ns.formulas.hacking.hackPercent(srv, player);
        const hackThreads = Math.floor(hackFraction / hackPercent);

        const moneyAfterHack = (srv.moneyAvailable ?? 0) * (1 - hackPercent * hackThreads);
        const growMult = (srv.moneyMax??0) / Math.max(moneyAfterHack, 1);
        const growThreads = Math.ceil(ns.growthAnalyze(target, growMult));

        const weakenThreadsForHack = Math.ceil(hackThreads * 0.002 / 0.05);
        const weakenThreadsForGrow = Math.ceil(growThreads * 0.004 / 0.05);

        const tHack = ns.formulas.hacking.hackTime(srv, player);
        const tGrow = ns.formulas.hacking.growTime(srv, player);
        const tWeaken = ns.formulas.hacking.weakenTime(srv, player);

        // --- Lanzar workers distribuidos ---
        const start = Date.now();

        await launchDistributed(ns, servers, "worker-hack.js", hackThreads, target, start + (tWeaken - tHack) - delayGap);
        await launchDistributed(ns, servers, "worker-weaken.js", weakenThreadsForHack, target, start);
        await launchDistributed(ns, servers, "worker-grow.js", growThreads, target, start + (tWeaken - tGrow) + delayGap);
        await launchDistributed(ns, servers, "worker-weaken.js", weakenThreadsForGrow, target, start + delayGap);

        await ns.sleep(tWeaken + 1000);

    }
}

/** Distribuye un job en todos los servidores disponibles */
/** @param {NS} ns **/
async function launchDistributed(ns:NS, servers:string[], script:string, totalThreads:number, target:string, startTime:number) {
    let remaining = totalThreads;

    // Ordenar servidores por RAM libre
    const sorted = servers
        .map(h => ({
            host: h,
            free: ns.getServerMaxRam(h) - ns.getServerUsedRam(h),
            scriptRam: ns.getScriptRam(script, h)
        }))
        .filter(s => s.free > s.scriptRam)
        .sort((a,b) => b.free - a.free);

    for (const {host, free, scriptRam} of sorted) {
        if (remaining <= 0) break;
        const threads = Math.min(Math.floor(free / scriptRam), remaining);

        if (threads > 0) {
            ns.exec(script, host, threads, target, startTime, Date.now());
            remaining -= threads;
        }
    }

    if (remaining > 0) {
        ns.tprint(`⚠️ No hubo suficiente RAM para ejecutar ${script}, faltaron ${remaining} threads`);
    }
}


/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data:AutocompleteData, args:string[]) {
    const servers = data.servers;
    return [...servers]
}