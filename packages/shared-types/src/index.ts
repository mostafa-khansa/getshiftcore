export enum Role {
    TENANT_ADMIN = 'TENANT_ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
}

export enum SubscriptionPlan {
    FREE_TRIAL = 'FREE_TRIAL',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
    ACTIVE = 'ACTIVE',
    PAST_DUE = 'PAST_DUE',
    CANCELED = 'CANCELED',
}

export enum RequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELED = 'CANCELED',
}

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    LATE = 'LATE',
    HALF_DAY = 'HALF_DAY',
    REMOTE = 'REMOTE',
    ON_LEAVE = 'ON_LEAVE',
}
