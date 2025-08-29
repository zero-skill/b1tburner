import { NS } from "@ns";
/** @param {NS} ns **/
export async function main(ns:NS) : Promise<void> {
    const target: string = ns.args[0].toString()
    await ns.grow(target);
}