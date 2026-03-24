import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface RenewalInput {
    documentBlob?: ExternalBlob;
    serviceName: string;
    govtFees: number;
    serviceCharge: number;
    nextExpiryDate: bigint;
    advancePaid: number;
    customerId: string;
    renewalDate: bigint;
}
export interface ExpenseRecord {
    id: string;
    date: bigint;
    createdAt: bigint;
    description: string;
    category: string;
    amount: number;
}
export interface DocumentLibraryInput {
    serviceName: string;
    blob: ExternalBlob;
    description?: string;
}
export interface CustomerInput {
    serviceType: string;
    serviceCategory: string;
    govtFees: number;
    applicationNo?: string;
    expiryDate?: bigint;
    name: string;
    deliveryDate?: bigint;
    totalCharged: number;
    notes?: string;
    advancePaid: number;
    phone: string;
    applicationDate: bigint;
    currentStatus: Status;
    documentBlobIds: Array<ExternalBlob>;
    customServiceName?: string;
}
export interface CustomerRecord {
    serviceType: string;
    serviceCategory: string;
    isDeleted: boolean;
    tokenId: string;
    govtFees: number;
    applicationNo?: string;
    expiryDate?: bigint;
    name: string;
    createdAt: bigint;
    deliveryDate?: bigint;
    totalCharged: number;
    updatedAt: bigint;
    notes?: string;
    advancePaid: number;
    balanceDue: number;
    phone: string;
    applicationDate: bigint;
    currentStatus: Status;
    deletedAt?: bigint;
    netProfit: number;
    documentBlobIds: Array<ExternalBlob>;
    customServiceName?: string;
}
export interface CustomServiceEntry {
    name: string;
    addedAt: bigint;
    category: string;
}
export interface RenewalRecord {
    id: string;
    documentBlob?: ExternalBlob;
    serviceName: string;
    govtFees: number;
    serviceCharge: number;
    createdAt: bigint;
    totalCharged: number;
    nextExpiryDate: bigint;
    advancePaid: number;
    balanceDue: number;
    customerId: string;
    renewalDate: bigint;
}
export interface DocumentLibraryItem {
    id: string;
    serviceName: string;
    blob: ExternalBlob;
    description?: string;
    uploadedAt: bigint;
}
export interface ExpenseInput {
    date: bigint;
    description: string;
    category: string;
    amount: number;
}
export interface ProfitSummary {
    today: number;
    thisMonth: number;
    totalNetProfit: number;
}
export interface UserProfile {
    name: string;
}
export interface ExpenseSummary {
    today: number;
    total: number;
    thisMonth: number;
}
export enum Status {
    pending = "pending",
    completed = "completed",
    in_process = "in_process"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomService(name: string, category: string): Promise<boolean>;
    addDocumentLibraryItem(input: DocumentLibraryInput): Promise<string>;
    addExpense(input: ExpenseInput): Promise<string>;
    addRenewalRecord(input: RenewalInput): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimFirstAdmin(): Promise<boolean>;
    createCustomer(input: CustomerInput): Promise<string>;
    deleteDocumentLibraryItem(id: string): Promise<boolean>;
    deleteExpense(id: string): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(tokenId: string): Promise<CustomerRecord>;
    getCustomerRenewalHistory(customerId: string): Promise<Array<RenewalRecord>>;
    getExpenseSummary(): Promise<ExpenseSummary>;
    getProfitSummary(): Promise<ProfitSummary>;
    getUpcomingRenewals(daysAhead: bigint): Promise<Array<CustomerRecord>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listCustomServices(): Promise<Array<CustomServiceEntry>>;
    listCustomers(): Promise<Array<CustomerRecord>>;
    listDeletedCustomers(): Promise<Array<CustomerRecord>>;
    listDocumentLibraryItems(): Promise<Array<DocumentLibraryItem>>;
    listExpenses(): Promise<Array<ExpenseRecord>>;
    restoreCustomer(tokenId: string): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    softDeleteCustomer(tokenId: string): Promise<boolean>;
    updateCustomer(tokenId: string, input: CustomerInput): Promise<boolean>;
}
