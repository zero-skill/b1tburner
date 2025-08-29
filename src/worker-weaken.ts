import { NS } from "@ns";
/** @param {NS} ns **/
export async function main(ns:NS) : Promise<void> {
    const target = ns.args[0].toString()
    await ns.weaken(target);
}