import type { LapRecord, StintRecord } from "@/lib/lapHistory";

export type ArchiveSession = { id:number;path:string;year:number;meeting:string;country:string|null;circuit?:string|null;kind:string;name:string;startUtc:string|null;endUtc?:string|null;totalLaps?:number|null;complete:boolean };
export type ArchiveDriver = { racingNumber:string;tla:string|null;fullName:string|null;teamName:string|null;teamColour:string|null };
export type ArchiveSessionDetail = ArchiveSession & { drivers:ArchiveDriver[];weatherSummary:Record<string,number|null> };
export type ArchiveEvent = { utc:string;kind:string;driverNr:string|null;lap:number|null;message:string|null };
export type ArchiveLaps = Record<string,LapRecord[]>;
export type ArchiveStints = Record<string,StintRecord[]>;
export type TelemetrySample = { tMs:number;lap:number|null;speed:number|null;rpm:number|null;gear:number|null;throttle:number|null;brake:number|null };
