import { NS, AutocompleteData } from "@ns";

/**
 * Ejecuta un worker en todas las máquinas disponibles con la mayor cantidad de hilos.
 * Uso:
 *   run distribute-task.js batching/worker-weaken.js n00dles
 *   run distribute-task.js batching/worker-hack.js foodnstuff
 */
export async function main(ns: NS): Promise<void> {
    const script: string = ns.args[0] as string;
    const target: string = ns.args[1] as string;
    const intensity: number = (ns.args[2] as number) ?? 1;
    ns.tprint(intensity);

    if (!script || !target) {
        ns.tprint("❌ Uso: run distribute-task.js <script> <target> [intensity]");
        return;
    }
    if (intensity < 1 || intensity > 3) {
        ns.tprint("⚠️ El parámetro intensity debe estar entre 1 y 3. Se usará 1 por defecto.");
    }
    const intensityFactor = Math.min(Math.max(intensity, 1), 3) / 3;

    // Escanear toda la red
    function scanNetwork(server: string, visited: Set<string> = new Set()): string[] {
        visited.add(server);
        for (const neighbor of ns.scan(server)) {
            if (!visited.has(neighbor)) scanNetwork(neighbor, visited);
        }
        return [...visited];
    }

    const servers: string[] = scanNetwork("home")
        .filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0);

    // Incluir home también
    if (!servers.includes("home")) servers.unshift("home");

    // Copiar el script a todos los servidores
    for (const s of servers) {
        ns.scp(script, s);
    }

    // Ejecutar el worker con la máxima cantidad de hilos en cada servidor
    for (const host of servers) {
        const maxRam = ns.getServerMaxRam(host);
        const usedRam = ns.getServerUsedRam(host);
        const freeRam = maxRam - usedRam;
        const scriptRam = ns.getScriptRam(script, host);

        if (freeRam < scriptRam) {
            ns.tprint(`⚠️ No hay RAM suficiente en ${host} para ejecutar ${script}`);
            continue;
        }

        const maxThreads = Math.floor(freeRam / scriptRam);
        const threads = Math.max(1, Math.floor(maxThreads * intensityFactor));

        ns.exec(script, host, threads, target);

        ns.tprint(`✅ Ejecutando ${script} en ${host} con ${threads} hilos contra ${target}`);
    }
}

/** Autocomplete */
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    if (args.length === 1) {
        // sugerir workers
        return ["worker-hack.js", "worker-grow.js", "worker-weaken.js"];
    }
    if (args.length === 2) {
        return data.servers; // sugerir servidores como target
    }
    return [];
}