// English translations (source) - REORGANIZED
// Common actions moved to `common`, domain-specific terms kept separate

export const en = {
  auth: {
    fastapiLogin: 'FastAPI Login',
    email: 'Email',
    password: 'Password',
    sign: 'Sign In',
    signOut: 'Sign Out',
    checkingAuthentication: 'Checking authentication...',
    appPasswordSmtp: 'App password or SMTP password',
    authenticationAccess: 'Authentication & Access',
    authenticationRequired: 'Authentication required',
    directGoogleSign: 'Direct Google Sign In',
    enforceStrongPasswords: 'Enforce Strong Passwords',
    requireComplexPasswords: 'Require complex passwords',
    requireTwoFactor: 'Require Two-Factor Authentication',
    signWithFastapi: 'Sign in with FastAPI credentials',
    socialAuthentication: 'Social Authentication',
    continueWithGoogle: 'Continue with Google',
    signingYouAgree: 'By signing in, you agree to our Terms of Service and Privacy Policy',
    signing: 'Signing in...',
    notSigned: 'Not signed in',
    welcomeBack: 'Welcome Back',
    signInToManage: 'Sign in to manage your hospitality schedule',
    signWithCredentials: 'Sign in with your credentials',
    invalidCredentials: 'Invalid email or password',
    loginFailed: 'Login failed. Please try again.',
    backToGoogle: '← Back to Google Sign In',
    demoCredentials: 'Demo Credentials:',

    // Forgot password
    forgotPassword: "Forgot Password?",
    forgotPasswordTitle: "Forgot Password",
    forgotPasswordDescription: "Enter your email address and we'll send you a link to reset your password.",
    sendResetLink: "Send Reset Link",
    sendingResetLink: "Sending...",
    checkYourEmail: "Check Your Email",
    resetLinkSent: "Password reset link has been sent to your email address.",
    resetLinkInstructions: "Check your email for a password reset link. The link will expire in 24 hours.",
    resetLinkFailed: "Failed to send reset link. Please try again.",
    backToLogin: "Back to Login",
    sendAnotherLink: "Send Another Link",

    // Reset Password
    resetPassword: "Reset Password",
    resetPasswordDescription: "Enter your new password below.",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    newPasswordPlaceholder: "Enter new password",
    confirmPasswordPlaceholder: "Confirm new password",
    passwordsDoNotMatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 8 characters long",
    passwordStrength: "Password Strength",
    resettingPassword: "Resetting Password...",
    passwordResetSuccess: "Password Reset Successfully",
    passwordResetSuccessDescription: "Your password has been reset. You can now sign in with your new password.",
    signInWithNewPassword: "Sign In with New Password",
    passwordResetFailed: "Failed to reset password. Please try again.",
    
    // Token Validation
    invalidResetLink: "Invalid Reset Link",
    invalidResetLinkDescription: "This password reset link is invalid or has expired. Please request a new one.",
    invalidOrExpiredToken: "Invalid or expired reset token",
    missingResetToken: "No reset token provided",
    tokenVerificationFailed: "Failed to verify reset token",
    verifyingResetLink: "Verifying reset link...",
    requestNewResetLink: "Request New Reset Link",

    // Sign Up
    signUp: "Sign Up",
    signUpTitle: "Create Your Account",
    signUpDescription: "Join thousands of businesses managing their staff schedules efficiently.",
    createAccount: "Create Account",
    creatingAccount: "Creating Account...",
    organizationName: "Organization Name",
    organizationNamePlaceholder: "Enter your business name",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    agreeToTerms: "I agree to the Terms of Service and Privacy Policy",
    alreadyHaveAccount: "Already have an account?",
    signUpWithGoogle: "Sign up with Google",
    signUpWithCredentials: "Sign up with Email",
    orSignUpWith: "Or sign up with",
    accountCreated: "Account created successfully! Please check your email to verify your account.",
    emailVerificationRequired: "Email verification required",
    checkEmailVerification: "Please check your email and click the verification link to activate your account.",
    resendVerification: "Resend Verification Email",

    // Account Linking
    accountLinking: "Account Linking",
    accountsLinked: "Accounts successfully linked",
    linkAccounts: "Link Accounts",
    linkAccountsDescription: "We found an existing account with this email. Would you like to link your Google account?",
    linkGoogleAccount: "Link Google Account",
    createSeparateAccount: "Create Separate Account",
    accountLinkingFailed: "Failed to link accounts",

    // Account Management
    manageAuthenticationMethods: "Manage your authentication methods. You can link multiple accounts for easier sign-in.",
    currentlyLinked: "Currently Linked",
    noLinkedAccountsFound: "No linked accounts found.",
    linkAdditionalAccounts: "Link Additional Accounts",
    linkingAccountsDescription: "Linking additional accounts allows you to sign in using different methods while maintaining the same profile and data.",
    cannotUnlinkOnlyMethod: "Cannot unlink the only authentication method",
    accountUnlinkedSuccessfully: "{{provider}} account unlinked successfully",
    failedToUnlinkAccount: "Failed to unlink account",
    linking: "Linking...",
    linkedOn: "Linked {{date}}",
    primary: "Primary",

    // General
    networkError: "Network error. Please check your connection and try again.",
    emailPlaceholder: "Enter your email address",
    passwordPlaceholder: "Enter your password",

    // Error messages
    featureNotAvailable: "Account linking feature is not yet available. Please contact your administrator.",
    unableToUnlinkAccount: "Unable to unlink account. Please try again later.",
    emailMismatchError: "Cannot link accounts: Email mismatch. Your Google account ({{email}}) doesn't match your system account. Please contact your administrator.",
    unableToLinkAccounts: "Unable to link accounts. Please try again later.",
    
    // Development notes
    developmentNote: "Development Note",
    emailMatchRequirement: "Account linking requires your Gmail email to match your system account ({{systemEmail}}). If emails don't match, linking will fail and you'll need to contact your administrator.",
  },

  common: {
    // ============================================================================
    // CORE ACTIONS (reusable across all components)
    // ============================================================================
    save: 'Save',
    saved: 'Saved',
    saveChanges: 'Save Changes',
    unsavedChanges: 'You have unsaved changes',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting...',
    edit: 'Edit',
    view: 'View',
    previewImport: 'Preview Import',
    viewAll: 'View All',
    viewDetails: 'View Details',
    viewHistory: 'View History',
    viewMore: 'View More',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    updating: 'Updating...',
    updateExisting: 'Update Existing',
    refresh: 'Refresh',
    refreshData: 'Refresh Data',
    reset: 'Reset',
    close: 'Close',
    open: 'Open',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    submit: 'Submit',
    confirm: 'Confirm',
    approve: 'Approve',
    finalApproval: 'Final Approval',
    needsWork: 'Needs Work',
    decline: 'Decline',
    reject: 'Reject',
    review: 'Review',
    checkDuplicates: 'Checking duplicates...',
    selectedImport: 'Selected for import',
    withDuplicates: 'With duplicates',
    conflicts: 'conflicts',
    records: "Records",
    declining: 'Declining...',
    cancelling: 'Cancelling...',
    by: 'by',
    day: 'Day',
    enable: 'Enable',
    or: 'or',
    primary: 'Primary',
    // Show/Hide actions
    show: 'Show',
    hide: 'Hide',
    showAll: 'Show All',
    hideAll: 'Hide All',
    saving: 'Saving...',
    
    // Selection actions
    select: 'Select',
    selected: 'Selected',
    selectAll: 'Select All',
    selectNone: 'Select None',
    clearAll: 'Clear All',
    clearSelection: 'Clear Selection',
    clearFilters: 'Clear Filters',
    
    // ============================================================================
    // COMMON STATUS TERMS (reusable)
    // ============================================================================
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    canceled: 'Cancelled',
    enabled: 'Enabled',
    disabled: 'Disabled',
    available: 'Available',
    unavailable: 'Not Available',
    online: 'Online',
    offline: 'Offline',
    waiting: "Waiting",
    lastWeek: 'Last Week',
    last30Days: 'Last 30 Days',
    last60Days: 'Last 60 Days',
    last90Days: 'Last 90 Days',
    days: 'days',
    retry: 'Retry',
    na: 'N/A',
    unknown: 'Unknown',
    emergency: 'Emergency',
    accepted: 'Accepted',
    
    // ============================================================================
    // GENERIC TERMS (reusable across domains)
    // ============================================================================
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    date: 'Date',
    time: 'Time',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    notes: 'Notes',
    reason: 'Reason',
    description: 'Description',
    details: 'Details',
    priority: 'Priority',
    type: 'Type',
    category: 'Category',
    order: 'Order',
    manage: 'Manage',
    important: 'Important',
    accept: 'Accept',
    more: 'more',
    viewOnly: 'View Only',
    covered: 'covered',
    avgPerDay: 'Avg per Day',
    viewingAs: 'Viewing as',
    myShifts: 'my shifts',
    totalShifts: 'total shifts',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    recommended: "Recommended",
    processing: "Processing...",
    yes: 'Yes',
    no: 'No',
      
    // Generic entities
    facility: 'Facility',
    facilities: 'Facilities',
    staff: 'Staff',
    user: 'User',
    member: 'Member',
    team: 'Team',
    role: 'Role',
    shift: 'Shift',
    shifts: 'Shifts',
    zone: 'Zone',
    zones: 'Zones',
    roles: 'Roles',
    
    // ============================================================================
    // COMMON UI ELEMENTS
    // ============================================================================
    actions: 'Actions',
    quickActions: 'Quick Actions',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    export: 'Export',
    exportReport: 'Export Report',
    import: 'Import file, supports Excel or CSV files',
    detectedColumns: 'Detected columns from file',
    settings: 'Settings',
    config: 'Configuration',
    options: 'Options',
    preferences: 'Preferences',
    expectedFormat: 'File expected to have atleast one of these columns',
    dropFile: 'Drop Excel or CSV file here',
    dropFileorChoose: 'Drop file here or click "Choose file" to select and upload a file',
    releaseFile: 'Release to import data from your file',
    fileSupport: 'Supports .xlsx and .csv files',
    uploadExcelOrCsv: 'Please upload an Excel (.xlsx) or CSV file.',
    
    // Form elements
    required: 'Required',
    optional: 'Optional',
    placeholder: 'Enter...',
    chooseFile: 'Choose File',
    uploadFile: 'Upload File',
    
    // ============================================================================
    // COMMON MESSAGES & STATES
    // ============================================================================
    loading: 'Loading...',
    loadingData: 'Loading data...',
    loadingZones: 'Loading zones...',
    loadingRoles: 'Loading roles...',
    noData: 'No data',
    noResults: 'No results',
    notFound: 'Not found',
    found: 'Found',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    conflictsAttention: 'conflicts that need attention.',
    override: 'Override conflicts (create duplicates)',
    actionCannotBeUndone: 'This action cannot be undone',
    
    // Success messages
    savedSuccessfully: 'Saved successfully',
    createdSuccessfully: 'Created successfully',
    updatedSuccessfully: 'Updated successfully',
    deletedSuccessfully: 'Deleted successfully',
    
    // Error messages
    failed: 'Failed',
    failedToLoad: 'Failed to load',
    failedToSave: 'Failed to save',
    failedToCreate: 'Failed to create',
    failedToUpdate: 'Failed to update',
    failedToDelete: 'Failed to delete',
    somethingWentWrong: 'Something went wrong',
    tryAgain: 'Try Again',
    
    // Confirmation messages
    areYouSure: 'Are you sure?',
    areYouSureDelete: 'Are you sure you want to delete',
    areYouSureCancel: 'Are you sure you want to cancel',
    cannotBeUndone: 'This action cannot be undone',
    
    // Generic states
    empty: 'Empty',
    full: 'Full',
    partial: 'Partial',
    none: 'None',
    all: 'All',
    issues: 'Issues',
    
    // ============================================================================
    // TIME & DATE TERMS
    // ============================================================================
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    nextWeek: 'Next Week',
    thisMonth: 'This Month',
    nextMonth: 'Next Month',
    thisPeriod: 'This Period',
    times: 'Times',
    weekOf: 'Week of',
    schedulesShown: 'schedules shown',
    of: 'of',
    
    // Time units
    hours: 'hours',
    minutes: 'minutes',
    weeks: 'weeks',
    months: 'months',

    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  
    // Short day names (for calendar headers, mobile views, etc.)
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    years: 'years',
    lastMonth: 'Last Month',
    
  // ============================================================================
  // SHIFTS (reusable across schedule, swaps, staff components)
  // ============================================================================
    morning: 'Morning',
    afternoon: 'Afternoon', 
    evening: 'Evening',
    night: 'Night',
  
    // Shift references
    morningShift: 'Morning Shift',
    afternoonShift: 'Afternoon Shift',
    eveningShift: 'Evening Shift',
    nightShift: 'Night Shift',
    
    // SwapNotificationDialog additional keys
    swapDetails: 'Swap Details',
    requester: 'Requester',
    original: 'Original',
    target: 'Target',
    
    // ============================================================================
    // NUMBERS & QUANTITIES
    // ============================================================================
    count: 'Count',
    total: 'Total',
    sum: 'Sum',
    average: 'Average',
    minimum: 'Minimum',
    maximum: 'Maximum',
    
    // ============================================================================
    // FACILITY TERMS (generic, reusable)
    // ============================================================================
    selectFacility: 'Select Facility',
    selectAFacility: 'Select a facility',
    facilityName: 'Facility Name',
    facilityType: 'Facility Type',
    detailedFacility: 'Detailed Facility Analysis',
    systemPerformance: 'System Performance',
    analytics: 'Analytics',
    
    // ============================================================================
    // REUSABLE PHRASES
    // ============================================================================
    noReasonProvided: 'No reason provided',
    checkBackSoon: 'Check back soon',
    comingSoon: 'Coming soon',
    notAvailable: 'Not available',
    notSet: 'Not set',
    notSpecified: 'Not specified',
    noAddress: 'No address',
    
    // Navigation helpers
    goBack: 'Go back',
    backToDashboard: 'Back to Dashboard',
    
    // Generic permissions/access
    accessDenied: 'Access Denied',
    permissionRequired: 'Permission required',
    unauthorized: 'Unauthorized',
    
    // Generic assignments/allocations
    assigned: 'Assigned',
    unassigned: 'Unassigned',
    assignments: 'Assignments',
    
    // ============================================================================
    // LEGACY TERMS (to be cleaned up/moved)
    // ============================================================================
    welcomeBack: 'Welcome Back',
    you: 'You',
    manager: 'Manager',
    profileSettings: 'Profile settings'
    // ... other legacy terms that need categorization
  },

  errors: {
    errorOccurredWhile: 'An error occurred while loading the application.',
    errorDetails: 'Error details',
    encounteredUnexpectedError: 'We encountered an unexpected error. Please try again.',
    reloadPage: 'Reload Page',
    oopsSomethingWent: 'Oops! Something went wrong',
  },

  navigation: {
    // ============================================================================
    // MAIN NAVIGATION
    // ============================================================================
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    staff: 'Staff',
    facilities: 'Facilities',
    swaps: 'Swaps',
    settings: 'Settings',
    profile: 'My Profile',
    
    // Navigation actions
    manageSchedules: 'Manage Schedules',
    manageStaff: 'Manage Staff',
    manageFacilities: 'Manage Facilities',
    
    // App identity
    hospitalityScheduler: 'Hospitality Scheduler',
    welcomeToHospitalityScheduler: 'Welcome to Hospitality Scheduler',
    modernPwaFor: 'Modern PWA for hospitality staff scheduling',
  },

  dashboard: {
    // ============================================================================
    // DASHBOARD-SPECIFIC TERMS
    // ============================================================================
    managerDashboard: 'Manager Dashboard',
    staffDashboard: 'Staff Dashboard',
    manageTeamAndFacilities: 'Manage your team and facilities',
    scheduleAndTeamOverview: "Here's your schedule and team activity overview",
    loading: 'Loading ...',
    
    // Dashboard sections
    recentActivity: 'Recent Activity',
    weekOverview: 'Week Overview',
    upcomingShifts: 'Upcoming Shifts',
    teamInsights: 'Team Insights',
    
    // Quick actions (dashboard-specific)
    viewMySchedule: 'View My Schedule',
    createAndEditSchedules: 'Create and edit staff schedules',
    addEditOrganizeTeam: 'Add, edit, and organize team members',
    approveAndManageChanges: 'Approve and manage shift changes',
    checkUpcomingShifts: 'Check your upcoming shifts',
    
    // Stats and metrics
    teamPerformance: 'Team Performance',
    teamHelped: 'Team Helped',
    yourContribution: 'Your Contribution',
    acceptanceRate: 'Acceptance Rate',
    helpfulnessScore: 'Helpfulness Score',
    currentStreak: 'Current Streak',
    avgResponseTime: 'Avg Response Time',
    teamCoverage: 'Team Coverage',
    
    // Dashboard states
    noUpcomingShifts: 'No upcoming shifts scheduled',
    noRecentSwapRequests: 'No recent swap requests',
    newRequestsWillAppear: 'New requests will appear here',
    errorLoading: 'Error loading dashboard',
    tryRefresh: 'Please try refreshing the page',
  },

  schedule: {
    // ============================================================================
    // SCHEDULE-SPECIFIC TERMS
    // ============================================================================
    schedule: 'Schedule',
    schedules: 'Schedules',
    mySchedule: 'My Schedule',
    noSchedule: 'No Schedule',
    scheduleActive: 'Schedule Active',
    noScheduleAvailable: 'No Schedule Available',
    manageSchedules: 'Manage Schedules',
    viewSchedule: 'View Schedule',
    seeAllShifts: 'See all your shifts',
    scheduleOverview: 'Schedule Overview',
    scheduleDetails: 'Schedule Details',
    scheduleSettings: 'Schedule Settings',
    scheduleManagement: 'Schedule Management',
    smartScheduleManagement: 'Smart Schedule Management',
    
    // Schedule views
    viewPeriod: 'View Period',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    dailySchedule: 'Daily Schedule',
    weeklySchedule: 'Weekly Schedule',
    monthlyOverview: 'Monthly Overview',
    mineOnly: 'MINE ONLY',
    currentWeek: 'Current Week',
    previousWeek: 'Previous Week',
    showMyShiftsOnly: 'Show My Shifts Only',
    yourAssignmentsOnly: 'Your assignments only',
    youreViewingFullSchedule: "You're viewing the full facility schedule. Your shifts are highlighted in color.",

    // Smart Generation
    generateSmartSchedule: 'Generate Smart Schedule',
    generatingSmartSchedule: 'Generating Smart Schedule...',
    smartGeneration: 'Smart Generation',
    
    // Generation specific
    zoneSetup: 'Zone Setup',
    aiOptimization: 'AI Optimization',
    previewAndGenerate: 'Preview & Generate',
    zoneBasedStaffAssignment: 'Zone-Based Staff Assignment',
    aiOptimizationSettings: 'AI Optimization Settings',
    generationPreview: 'Generation Preview',
    aiPoweredGeneration: 'AI-Powered Generation',
    
    // Smart constraints
    useSmartConstraints: 'Use Smart Constraints',
    applyBusinessRules: 'Apply business rules and regulations',
    requireManagerPerShift: 'Require Manager per Shift',
    ensureManagerialOversight: 'Ensure managerial oversight',
    distributeHoursEvenly: 'Distribute hours evenly',
    allowOvertime: 'Allow Overtime',
    permitOvertimeScheduling: 'Permit overtime scheduling',
    
    // Coverage and optimization
    coveragePriority: 'Coverage Priority',
    minimalCoverage: 'Minimal Coverage',
    balancedCoverage: 'Balanced Coverage',
    maximumCoverage: 'Maximum Coverage',
    shiftPreferenceMultipliers: 'Shift Preference Multipliers',
    higherValuesIncrease: 'Higher values increase staffing preference for that shift',
    prioritizeSkillMatching: 'Prioritize Skill Matching',
    matchStaffSkillsToZone: 'Match staff skills to zone requirements',
    
    // Zone configuration
    coverage: 'Coverage',
    requiredRoles: 'Required Roles',
    allRolesAccepted: 'All roles accepted',
    
    // Preview and feasibility
    totalAssignmentsNeeded: 'Total Assignments Needed',
    feasibility: 'Feasibility',
    optimal: 'Optimal',
    challenging: 'Challenging',
    zoneCoverageSummary: 'Zone Coverage Summary',
    
    // AI description
    aiScheduleDescription: 'The system will automatically assign staff to zones based on roles, skills, and your configured constraints. Staff will be optimally distributed across {periodType} periods with intelligent workload balancing.',

    // Configuration modal specific
    timeHoursConstraints: 'Time & Hours Constraints',
    staffingRequirements: 'Staffing Requirements',
    shiftSpecificRequirements: 'Shift-Specific Requirements',
    configurationValid: 'Configuration Valid',
    resetToDefaults: 'Reset to Defaults',
    noChanges: 'No Changes',
    
    // Field labels
    minimumRestHours: 'Minimum Rest Hours',
    hoursBetweenShifts: 'Hours between shifts',
    maxConsecutiveDays: 'Max Consecutive Days',
    workingDaysInRow: 'Working days in a row',
    defaultMaxWeeklyHours: 'Default Max Weekly Hours',
    whenStaffMaxHoursNotSet: 'When staff max hours not set',
    requireManagerOnEveryShift: 'Require manager on every shift',
    
    // Shift requirements
    minimumSkillLevel: 'Minimum Skill Level',
    clickRolesToRequire: 'Click roles to require them for this shift',
    
    // Shift names and times
    morningShift: 'Morning Shift',
    afternoonShift: 'Afternoon Shift',
    eveningShift: 'Evening Shift',
    morningTime: '6:00 AM - 2:00 PM',
    afternoonTime: '2:00 PM - 10:00 PM',
    eveningTime: '10:00 PM - 6:00 AM',
    
    // Status messages
    configurationDescription: 'All constraints are properly configured and will be applied during schedule generation',
    
    
    
    // Schedule Status
    empty: 'Empty',
    partial: 'Partial',
    complete: 'Complete',

    // Schedule-specific time periods
    todayShifts: "Today's Shifts",
    shiftTime: 'Shift Time',
    shiftName: 'Shift Name',
    shiftDay: 'Shift / Day',
    shiftReminders: 'Shift Reminders',
    upcomingShifts: 'Upcoming Shifts',
    unknownShift: 'Unknown Shift',
    
    // Schedule creation/management
    createSchedule: 'Create Schedule',
    publishSchedule: 'Publish Schedule',
    publishChanges: 'Publish Changes',
    generateSchedule: 'Generate Schedule',
    smartGenerate: 'Smart Generate',
    noScheduleForThisWeek: 'No schedule available for this week',
    noScheduleCreatedYet: 'No schedule created for this week',
    generateNewScheduleOrAssign: 'Generate a new schedule automatically or manually create assignments.',
    
    // Schedule states
    fullyStaffed: 'Fully Staffed',
    partiallyStaffed: 'Partially Staffed',
    scheduleExists: 'Schedule exists',
    
    // AI/Automation specific
    aiPoweredScheduling: 'AI-powered scheduling with zone-based optimization',
    smartScheduleGeneration: 'Smart Schedule Generation',
    poweredGeneration: 'AI-Powered Generation',
    
    // Schedule-specific facilities/zones
    facilityAndZones: 'Facility & Zones',
    activeZones: 'Active Zones',
    zoneBasedStaff: 'Zone-Based Staff Assignment',
    
    // Staff assignment (schedule context)
    assignStaff: 'Assign staff',
    staffPerShift: 'Staff per Shift',
    maxStaff: 'Max Staff',
    minStaff: 'Min Staff',
    dropStaffHere: 'Drop staff here or click to assign',
    availableStaff: 'Available Staff',
    affectedStaff: 'Affected Staff',
    staffInvolved: 'Staff Involved',
    staffRange: 'Staff Range',
    staffViewOptions: 'Staff View Options',
    minStaffPer: 'Min Staff per Shift',
    maxStaffPer: 'Max Staff per Shift',
    requiredStaff: 'Required Staff',
    assignedStaff: 'Assigned Staff',
    staffScheduled: 'Staff Scheduled',
    staffAssignments: 'Staff Assignments',
    daysScheduled: 'Days Scheduled',
    totalHours: 'Total Hours',
    totalAssignments: 'Total Assignments',
    totalCoverage: 'Total Coverage',
    weeklyActivity: 'Weekly Activity',

    // Configuration
    scheduleConfiguration: 'Schedule Configuration',
    schedulingConstraints: 'Scheduling Constraints',
    configuration: 'Configuration',
    saveConfiguration: 'Save Configuration',
    loadingConfiguration: 'Loading configuration...',
    loadingShiftConfiguration: 'Loading shift configuration...',
    configurationSavedSuccessfully: 'Configuration saved successfully!',
    failedSaveConfiguration: 'Failed to save configuration',
    failedLoadConfiguration: 'Failed to load configuration',
    
    // Messages specific to scheduling
    yourManagerHasntCreated: "Your manager hasn't created a schedule for this period yet.",
    viewYourWorkSchedule: 'View your work schedule and request shift swaps',
    chooseFacilityFromDropdown: 'Choose a facility from the dropdown above to view and manage schedules',
    loadingScheduleData: 'Loading schedule data...',
    deleteScheduleConfirmation: 'Are you sure you want to delete the schedule for the week of {weekDate}?\n\nThis will permanently remove {assignmentCount} assignments and cannot be undone.',
    
    // Swap integration (schedule context)
    requestSwap: 'Request Swap',
    mySwapRequests: 'My Swap Requests',
    viewAllMySwaps: 'View All My Swaps',
    noSwapRequests: 'No Swap Requests',
    noSwapRequestsYet: "You haven't submitted any swap requests yet.",
    createFirstSwapRequest: 'Create Your First Swap Request',
    createNewSwapRequest: 'Create New Swap Request',
    specificSwapRequest: 'Specific Swap Request',
    autoAssignmentRequest: 'Auto Assignment Request',

    // PDF and Export
    generatePdfSchedule: 'Generate PDF Schedule',
    createPrintablePdf: 'Create a printable PDF version of the schedule',
    pdfScheduleWill: 'A PDF schedule will be generated and attached to notifications',
    
    // Date and Time
    unknownDate: 'Unknown date',
    weekRange: 'Week Range',
    dateRange: 'Date Range',
    
    // Additional UI Elements
    searchSchedules: 'Search schedules by date...',
    allStatus: 'All Status',
    noSchedulesFound: 'No schedules found',
    tryAdjustingFilters: 'Try adjusting your search or filters',
    
    // Smart Generation Options
    useConstraints: 'Use Constraints',
    autoAssignByZone: 'Auto-assign by Zone',
    balanceWorkload: 'Balance Workload',
    prioritizeSkillMatch: 'Prioritize Skill Match',
    minimal: 'Minimal',
    balanced: 'Balanced',
    maximum: 'Maximum',
    shiftPreferences: 'Shift Preferences',
    morningMultiplier: 'Morning Multiplier',
    afternoonMultiplier: 'Afternoon Multiplier',
    eveningMultiplier: 'Evening Multiplier',
    allConstraintsAre: 'All constraints are properly configured and will be applied during schedule generation',
    
    // Zone Management
    requiresManager: 'Requires Manager',
    
    // Additional Actions
    resetChanges: 'Reset Changes',
    resetDefaults: 'Reset to Defaults',
    
    // Messages and Confirmations
    areYouSure: 'Are you sure you want to delete the schedule for the week?',
    deleteScheduleWarning: 'This action cannot be undone.',
    scheduleDeletedSuccessfully: 'Schedule deleted successfully',
    
    // Period Types
    periodType: 'Period Type',
    generateDaily: 'Generate Daily',
    generateWeekly: 'Generate Weekly',
    generateMonthly: 'Generate Monthly',

    // Business Rules
    allowOvertimeScheduling: 'Allow overtime scheduling',
    applyWeekendRestrictions: 'Apply weekend restrictions',
    
    // Swap Integration
    swapActivity: 'Swap activity',
    swapAssignments: 'Swap Assignments',

    you: 'You',
    
    // Additional management terms
    allFacilityAssignments: 'All facility assignments',
    assignmentsAndCannot: 'assignments and cannot be undone',
    approveAndManage: 'Approve and manage shift changes',

    // Schedule Operations
    unsavedChanges: 'Unsaved Changes',
    assignmentFailed: 'Assignment Failed',
    failedRetryAuto: 'Failed to retry auto-assignment',
    failedCreateShift: 'Failed to create shift',
    failedUpdateShift: 'Failed to update shift',
    failedUpdateShifts: 'Failed to update shifts',
    failedDeleteSchedule: 'Failed to delete schedule',
    retryAssignment: 'Retry Assignment'
  },

  staff: {
    // ============================================================================
    // STAFF-SPECIFIC TERMS
    // ============================================================================
    staffMember: 'Staff Member',
    staffMembers: 'Staff Members',
    manageStaff: 'Manage Staff',
    addStaffMember: 'Add Staff Member',
    staffManagement: 'Staff Management',
    staffAnalytics: 'Staff Analytics',
    manageTeamAllFacilities: 'Manage your team across all facilities',
    accessDeniedManager: 'Access denied. Manager permissions required.',
    accessDenied: 'Access Denied',
    managerPermissionsRequired: 'You need manager permissions to access staff management.',
    returnToDashboard: 'Return to Dashboard',
    dragDropImport: 'Drag & Drop Excel files anywhere',
    importInstructions: 'to instantly import staff members. We support .xlsx and .csv files with columns: Name, Email, Role, Phone, Facility, Skill Level, Status.',
    orClickImportButton: 'You can also click the Import staff button to upload a file.',
    importStaff: 'Import Staff',
    uploadExcelOrCsv: 'Please upload an Excel (.xlsx) or CSV file',
    importSuccess: 'Successfully imported {{count}} staff members!',
    importPartialSuccess: 'Imported {{added}} staff members with {{errors}} errors',
    importFailed: 'Failed to import staff. Please check the file format.',
    allFacilities: 'All Facilities',
    tryAdjustingFilters: 'Try adjusting your search or filters',
    addFirstStaff: 'Add First Staff Member',
    addStaff: 'Add Staff',
    totalStaff: 'Total Staff',
    activeStaff: 'Active Staff',
    avgSkillLevel: 'Avg Skill Level',
    failedLoadData: 'Failed to load staff data',
    unknownFacility: 'Unknown',
    roleAndSkills: 'Role & Skills',
    facility: 'Facility',
    contact: 'Contact',
    status: 'Status',
    actions: 'Actions',
    level: 'Level',
    active: 'Active',
    inactive: 'Inactive',
    maxHours: 'Max {{hours}}h/week',
    deleteStaffMember: 'Delete Staff Member',
    staffDeletedSuccess: '{{name}} deleted successfully',
    failedDeleteStaff: 'Failed to delete staff member',
    deleteConfirmation: 'Are you sure you want to delete {{name}}? This action cannot be undone.',
    deletingWillCause: 'Deleting this staff member will:',
    removeFromSchedules: 'Remove them from all schedules',
    cancelPendingSwaps: 'Cancel any pending shift swaps', 
    deleteAvailability: 'Delete their availability records',
    uploadingFile: 'Uploading File...',
    readingExcelFile: 'Reading your Excel file',
    processingData: 'Processing Data...',
    validatingStaffInfo: 'Validating staff information',
    importingStaff: 'Importing Staff...',
    addingToDatabase: 'Adding staff members to database',
    importComplete: 'Import Complete!',
    importCompleteDesc: 'Successfully imported {{count}} staff members',
    somethingWentWrong: 'Something went wrong during import',
    staffAdded: 'Staff Added',
    errors: 'Errors',
    importErrorMessage: 'Please check your file format and try again. Make sure all required columns are present.',
    validRecords: 'Valid Records',
    invalidRecords: 'Invalid Records',
    totalRecords: 'Total Records',
    chooseDifferentFile: 'Choose a different file',
    importStaffMembers: 'Import staff record(s)',
    missingStaff: 'No staff available',
    availableStaff: 'Available Staff',
    filterByRole: 'Filter by Role',
    allRoles: 'All Roles',
    dragDropAssignment: 'Drag & Drop Assignment',
    dragStaffToCalendar: 'Drag staff members from this panel and drop them onto calendar slots to create assignments',
    
    // Staff roles
    manager: 'Manager',
    assistantManager: 'Assistant Manager',
    frontDeskAgent: 'Front Desk Agent',
    lineCook: 'Line Cook',
    sousChef: 'Sous Chef',
    uniqueRoles: 'Unique Roles',
    
    // Staff-specific actions
    searchStaff: 'Search staff...',
    searchStaffByNameRole: 'Search staff by name or role',
    showInactiveStaff: 'Show inactive staff',
    addNewStaff: 'Add New Staff Member',
    
    // Staff states
    activeStaffMember: 'Active staff member',
    noStaffFound: 'No staff found',
    
    // Staff management
    workDetails: 'Work Details',
    roleSkills: 'Role & Skills',
    skillLevel: 'Skill Level',
    maxWeeklyHours: 'Max Weekly Hours',
    managerOnlyAccess: 'Manager access only',
    
    // Staff performance
    staffPerformanceLeaderboard: 'Staff Performance Leaderboard',
    teamPlayer: 'Team Player',
    topPerformer: 'Top performer',
    coverageHeroes: 'Coverage Heroes',
    reliabilityScore: 'Reliability Score',
    
    // Staff-specific messages
    manageYourTeam: 'Manage your team and facilities',
    couldNotLink: 'Could not link your user account to a staff profile. Please contact your manager.',
    youNeedManager: 'You need manager permissions to access staff management.',

    // Modal titles and headers
    editStaffMember: 'Edit {{name}}',
    basicInformation: 'Basic Information',
    addNewStaffMember: 'Add New Staff Member',
    adding: 'Adding...',

    // StaffAnalyticsDashboard specific translations
    noAnalyticsDataAvailable: 'No analytics data available',
    totalStaffActive: 'Total Staff Active',
    activeStaffMembers: 'active staff members',
    swapRequestsCompleted: 'swap requests completed',
    averageResponseTime: 'average response time',
    teamReliabilityScore: 'Team Reliability Score',
    overallTeamReliability: 'overall team reliability',
    topPerformers: 'Top Performers',
    requestsHelped: 'requests helped',
    noPerformanceDataAvailable: 'No performance data available',
    requestTrends: 'Request Trends',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    monthlyAverage: 'Monthly Average',
    noTrendDataAvailable: 'No trend data available',
    responseTimeDistribution: 'Response Time Distribution',
    responses: 'responses',
    noResponseDataAvailable: 'No response data available',
    insightsAndRecommendations: 'Insights & Recommendations',
    noInsightsAvailable: 'No insights available',
    moreDataNeeded: 'More data needed for analysis',
    topRequestingStaff: 'Top Requesting Staff',
    noSwapRequestsInPeriod: 'No swap requests in this period',
    uniqueRequesters: 'Unique Requesters',
    greatNewsNoProblemPatterns: 'Great News! No Problem Patterns Detected',
    teamManagingSwapsEfficiently: 'Your team is managing swaps efficiently with no concerning patterns.',
    problemPatternsDetected: 'Problem Patterns Detected',
    highFrequencyRequesters: 'High Frequency Requesters (>5 requests)',
    unknownRole: 'Unknown Role',
    frequentEmergencyUsers: 'Frequent Emergency Users',
    emergencies: 'emergencies',
    lowSuccessRate: 'Low Success Rate (<50%)',
    recommendation: 'Recommendation',
    considerOneOnOneMeetings: 'Consider one-on-one meetings with highlighted staff to understand their challenges and provide support.',
    mostCommonSwapReasons: 'Most Common Swap Reasons',
    noReasonsDataAvailable: 'No reasons data available',
    insight: 'Insight',
    mostCommonReasonInsight: '{{reason}} is the most common reason with {{rate}}% approval rate.',
    personalMatters: 'Personal matters',
    helpful: 'helpful',
    opportunities: 'opportunities',
    leadsTeamInHelping: '{{name}} leads the team in helping colleagues with swap coverage.',
    
    // Success/Error messages for ADDING with templates
    staffAddedSuccessfully: '{{name}} added successfully!',
    failedAddStaff: 'Failed to add staff member',
    staffWithInfoAlreadyExists: 'A staff member with this information already exists',
    emailExists: 'Email already exists:',
    emailExist: 'Email exists',
    similar: 'Similar found',
    nameFound: 'Similar names found:',
    phoneExists: 'Phone may exist:',
    duplicateDetectedOverride: 'Duplicate detected. Please check and take action.',
    
    // Form fields
    fullName: 'Name',
    fullNamePlaceholder: 'John Doe',
    emailAddress: 'Email Address',
    emailPlaceholder: 'john.doe@company.com',
    phoneNumber: 'Number',
    phonePlaceholder: '+1 (555) 123-4567',
    role: 'Role',
    rolePlaceholder: 'Receptionist',
    facilityPlaceholder: 'Seaside hotel',
    skillLevelPlaceholder: '3',
    // Skill levels
    skillBeginner: 'Beginner',
    skillBasic: 'Basic', 
    skillIntermediate: 'Intermediate',
    skillAdvanced: 'Advanced',
    skillExpert: 'Expert',
    levelNumber: 'Level {{level}}',

    hours: 'Weekly hours',
    
    // Placeholders and selects
    customRolePlaceholder: 'Or enter custom role...',
    selectFacility: 'Select a facility',
    columnNamesFlexible: 'Column names are flexible - the system automatically detects common variations',
    
    // Status and actions
    updating: 'Updating...',
    noChanges: 'No Changes',

    // Invition related
    sendInvitations: 'Send Invitations',
    sendInvitationsQuestion: 'Send Invitations to New Staff?',
    invitationConfirmMessage: 'Successfully imported {{count}} staff members. Would you like to send them invitations to join the system?',
    invitationConfirmSubtitle: 'Staff with email addresses will receive an invitation to create their accounts and access the scheduling system.',
    sendInvitationsButton: 'Send {{count}} Invitations',
    skipInvitations: 'Skip for Now',
    customizeInvitationMessage: 'Customize Invitation Message (Optional)',
    invitationMessagePlaceholder: 'Welcome to our team! Please use this invitation to access our scheduling system...',
    invitationExpiry: 'Invitation Validity',
    invitationExpiryOptions: {
      '24': '24 hours',
      '72': '3 days', 
      '168': '1 week (recommended)',
      '336': '2 weeks',
      '720': '30 days'
    },

    // Delete confirmation
    removeStaffMember: "Remove {name}",
    chooseRemovalMethod: "Choose how to handle this staff member's removal",
    checkingImpact: "Checking impact...",
    impactAssessment: "Impact Assessment",
    issuesFound: "Issues found:",
    consider: "Consider:",
    futureShifts: "Future Shifts",
    pendingSwaps: "Pending Swaps", 
    managerRole: "Manager Role",
    uniqueSkills: "Unique Skills",
    removeFromActiveStaff: "Remove from Active Staff",
    deactivateDescription: "Deactivates {name} but keeps all history for reporting",
    deactivateStaffMember: "Deactivate Staff Member",
    removeAndClearSchedule: "Remove and Clear Schedule",
    permanentlyDelete: "Permanently Delete",
    deactivatedSuccessfully: "{name} has been deactivated successfully",
    removedWithSchedulesCleared: "{name} has been removed and {count} schedules cleared",
    deleteError: {
      hasAssignments: "Cannot remove staff member. They have active assignments that need to be handled first.",
      tryRemoveAndClear: "Try using 'Remove and Clear Schedule' option instead.",
      },
    failedToValidateDeletion: 'Failed to validate deletion',
    unableToValidateDeletion: 'Unable to validate deletion', 
    chooseAction: 'Choose Action',
    removesAssignmentsAndDeactivates: 'Removes {{count}} future assignments and deactivates staff',
    historyPreservedShiftsCleared: 'History preserved • Future shifts cleared • ⚠️ Shifts will be unassigned',
    advancedOptions: 'Advanced Options', 
    completeRemoval: 'Complete Removal',
    adminOnly: 'Admin Only',
    permanentlyDeletesAllData: 'Permanently deletes all data - cannot be undone',
    dataEntryErrorsOnly: '⚠️ For data entry errors or privacy requests only',
    wontAppearInScheduling: "Won't appear in future scheduling • ✓ All past data preserved • ⚠️ Future shifts will need coverage",
    
    // Invitation sending progress/results
    sendingInvitations: 'Sending Invitations...',
    invitationsSentSuccessfully: 'Invitations sent successfully!',
    invitationsSentPartial: 'Sent {{sent}} of {{total}} invitations successfully',
    invitationsSentComplete: '{{count}} invitations sent successfully!',
    invitationsFailedToSend: 'Failed to send some invitations',
    invitationSendError: 'Error sending invitations: {{error}}',
    
    // Staff without email handling
    staffWithoutEmail: 'Staff Without Email',
    staffWithoutEmailCount: '{{count}} staff members don\'t have email addresses and won\'t receive invitations',
    staffWithoutEmailList: 'Staff without email: {{names}}',
    
    // Invitation status messages
    invitationAlreadyExists: 'Some staff already have pending invitations',
    invitationDuplicateWarning: 'Skipped {{count}} staff members who already have active invitations',
    
    // Invitation management
    manageInvitations: 'Manage Invitations',
    viewInvitationStatus: 'View Invitation Status',
    resendInvitation: 'Resend Invitation',
    cancelInvitation: 'Cancel Invitation',
    
    // Import with invitations combined
    importAndInvite: 'Import & Invite Staff',
    importCompleteNextStep: 'Import Complete - Next: Send Invitations',
    
    // Success/Error messages with templates
    fillRequiredFields: 'Please fill in all required fields',
    noChangesToSave: 'No changes to save',
    staffNameExistsAtFacility: 'A staff member named "{{name}}" already exists at this facility',
    staffUpdatedSuccessfully: '{{name}} updated successfully!',
    staffNameAlreadyExists: 'A staff member with this name already exists',
    failedUpdateStaff: 'Failed to update staff member',
  },

  facilities: {
    // ============================================================================
    // FACILITIES-SPECIFIC TERMS
    // ============================================================================
    facilityManagement: 'Facilities Management',
    addNewFacility: 'Add New Facility',
    addFacility: 'Add Facility',
    createFacility: 'Create Facility',
    facilities: 'Facilities',
    editFacility: 'Edit {{name}}',
    facilityName: 'Facility Name',
    addedSuccessfully: '{{name}} added successfully!',
    updatedSuccessfully: '{{name}} updated successfully!',
    failedToUpdate: 'Failed to update facility',
    staffAvailable: 'staff available',
    staffAutoAssignedByRoles: 'Staff will be automatically assigned based on their roles and zone requirements.',
    zonesSelected: '{{count}} zone(s) selected',

    
    // Page descriptions
    configureFacilitiesDescription: 'Configure facilities, shifts, roles, and operational zones',
    
    // Import instructions
    dragDropInstructions: 'Drag & Drop Excel files anywhere to instantly import facilities. Support columns: Name, Address, Type (Hotel/Restaurant/Resort/Cafe/Bar).',
    
    // Search and filters
    searchFacilities: 'Search facilities by name or address...',
    allTypes: 'All Types',
    
    // Facility types
    hotel: 'Hotel',
    restaurant: 'Restaurant', 
    resort: 'Resort',
    cafe: 'Cafe',
    bar: 'Bar',
    barLounge: 'Bar/Lounge',
    
    // Facility type descriptions
    fullServiceHotel: 'Full-service hotel with front desk, housekeeping, and guest services',
    largeResortProperty: 'Large resort property with multiple amenities and services',
    diningEstablishmentWith: 'Dining establishment with kitchen, service, and bar operations',
    barLoungeWith: 'Bar or lounge with beverage service and light food',
    coffeeShopCasual: 'Coffee shop or casual dining with counter service',
    
    // Zone names
    frontDesk: 'Front Desk',
    housekeeping: 'Housekeeping',
    kitchen: 'Kitchen',
    dining: 'Dining',
    security: 'Security',
    management: 'Management',
    pool: 'Pool',
    spa: 'Spa',
    activities: 'Activities',
    counter: 'Counter',
    seating: 'Seating',
    host: 'Host Station',
    lobby: 'Lobby & Common Areas',
    maintenance: 'Maintenance',
    serviceCounter: 'Service Counter',
    prepArea: 'Prep Area',
    
    // Shift names
    dayShift: 'Day Shift',
    eveningShift: 'Evening Shift',
    nightShift: 'Night Shift',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    opening: 'Opening',
    midday: 'Midday',
    closing: 'Closing',
    happyHour: 'Happy Hour',
    evening: 'Evening',
    lateNight: 'Late Night',
    morning: 'Morning',
    afternoon: 'Afternoon',
    
    // Common roles
    manager: 'Manager',
    frontDeskAgent: 'Front Desk Agent',
    housekeeper: 'Housekeeper',
    concierge: 'Concierge',
    chef: 'Chef',
    sousChef: 'Sous Chef',
    waiter: 'Waiter',
    waitress: 'Waitress',
    bartender: 'Bartender',
    poolAttendant: 'Pool Attendant',
    spaTherapist: 'Spa Therapist',
    activitiesCoordinator: 'Activities Coordinator',
    barista: 'Barista',
    cashier: 'Cashier',
    baker: 'Baker',
    server: 'Server',
    dj: 'DJ',
    
    // Stats and counts
    staff: 'Staff',
    shifts: 'Shifts',
    schedules: 'Schedules',
    activeZones: 'Active Zones',
    activeFacilities: 'Active Facilities',
    
    // Management actions
    roles: 'Roles',
    zones: 'Zones',
    
    // Zone management
    zonesDepartments: 'Zones & Departments',
    unnamedZone: 'Unnamed Zone',
    
    // Role management  
    defaultRoles: 'Default Roles',
    addNewRole: 'Add New Role',
    
    // Empty states
    noFacilitiesYet: 'No facilities yet',
    noFacilitiesFound: 'No facilities found',
    getStartedMessage: 'Get started by adding your first facility or importing from Excel',
    tryAdjustingFilters: 'Try adjusting your search or filters',
    
    // Import process
    dropToImport: 'Drop to Import Facilities',
    releaseToImport: 'Release to import facilities from Excel/CSV file',
    importingFacilities: 'Importing Facilities',
    uploadingFile: 'Uploading file...',
    processingFacilities: 'Processing facilities...',
    importComplete: 'Import complete!',
    successfullyImported: 'Successfully imported {{count}} facilities',
    
    // File upload
    pleaseUploadExcel: 'Please upload an Excel (.xlsx) or CSV file',
    failedToImportCheck: 'Failed to import facilities. Please check the file format.',
    
    // Permission messages
    managerPermissionsRequired: 'Manager permissions required.',
    checkingPermissions: 'Checking permissions...',
    loadingFacilities: 'Loading facilities...',
    accessDeniedMessage: 'You need manager permissions to access facilities management.',
    
    // Delete confirmation
    areYouSureDelete: 'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
    deletedSuccessfully: '{{name}} deleted successfully',
    failedToDeleteFacility: 'Failed to delete facility',
    
    // Other facility messages
    briefDescriptionThe: 'Brief description of the facility...',
    more: 'more',
    unnamedFacility: 'Unnamed Facility',
    
    // Modal and form labels
    facilityDetails: 'Facility Details',
    contactInformation: 'Contact Information',
    selectFacilityType: 'Select Facility Type',
    facilityConfiguration: 'Facility Configuration',
    importFacilities: 'Import Facilities',
    columnNamesFlexible: 'Column names are flexible - the system automatically detects common variations.',
  processingFile: 'Processing file...',
  previewImportData: 'Preview Import Data',
  facilitiesFound: 'facilities found',
  selected: 'selected',
  checkingDuplicates: 'Checking duplicates...',
  foundConflicts: 'Found {{count}} conflicts that need attention.',
  overrideConflicts: 'Override conflicts (create duplicates)',
  backToUpload: 'Back to Upload',
  importFacilitiesCount: 'Import {{count}} Facilities',
  
  // Duplicate Detection
  exactNameMatch: 'Exact name match:',
  similarNamesFound: 'Similar names found:',
  addressMatches: 'Address matches:',
  duplicateDetected: 'Duplicate detected. Please check and take action.',
  
  // Validation Messages
  facilityNameRequired: 'Facility name is required (minimum 2 characters)',
  unknownFacilityType: 'Unknown facility type "{{type}}", defaulting to Hotel',
  invalidEmailFormat: 'Invalid email format',
  
  // File Processing
  noDataFound: 'No data found in file',
  failedToParseExcel: 'Failed to parse Excel file',
  
  // Import Results (for toast messages in page)
  skippedDuplicates: 'Skipped {{count}} duplicate facilities',
  facilitiesHadErrors: '{{count}} facilities had errors',
  potentialDuplicatesDetected: 'Potential duplicates detected: {{facilities}}',
  failedToImportFacilities: 'Failed to import facilities. Please check your data and try again.',
  
  // Column Labels (when detected)
  nameColumn: 'Name',
  typeColumn: 'Type', 
  locationColumn: 'Location',
  addressColumn: 'Address',
  phoneColumn: 'Phone',
  emailColumn: 'Email',
  descriptionColumn: 'Description',
    
    // Shift management
    shiftManagement: 'Shift Management',
    shiftConfiguration: 'Shift Configuration',
    addShift: 'Add Shift',
    editShift: 'Edit Shift',
    loadTemplate: 'Load Template',
    resetChanges: 'Reset Changes',
    configurationSummary: 'Configuration Summary',
    activeShifts: 'Active Shifts',
    staffRange: 'Staff Range',
    managerRequired: 'Manager Required',
    totalCoverage: 'Total Coverage',
    shiftsConfigured: 'shifts configured',
    shiftConfigured: 'shift configured',
    loadingShiftConfiguration: 'Loading shift configuration...',
    chooseTemplate: 'Choose a template:',
    fixFollowingIssues: 'Please fix the following issues:',
    shiftName: 'Shift Name',
    startTime: 'Start Time',
    endTime: 'End Time',
    minStaff: 'Min Staff',
    maxStaff: 'Max Staff',
    duration: 'Duration',
    requiresManager: 'Requires Manager',
    warningExistingSchedules: 'Existing schedules will use the shift names but new schedules will use these time settings.',
    shiftsImpactAlert: 'Changes to shift configuration will affect all future scheduling.',
    warningOverlap: 'Warning: Shifts "{{name1}}" and "{{name2}}" have the same start time',
    atLeastOneStaff: 'Shift {{index}}: At least 1 staff member is required',
    templateApplied: 'Applied {{type}} template',
    
    // Role management
    roleManagement: 'Role Management',
    addRole: 'Add Role',
    editRole: 'Edit Role',
    deleteRole: 'Delete Role',
    roleName: 'Role Name',
    roleNameRequired: 'Role name is required',
    skillLevelRange: 'Skill Level Range',
    minSkillLevel: 'Min Skill Level',
    maxSkillLevel: 'Max Skill Level',
    managementRole: 'Management Role',
    hourlyRateRange: 'Hourly Rate Range',
    minHourlyRate: 'Min Hourly Rate',
    maxHourlyRate: 'Max Hourly Rate',
    isManagement: 'Is Management',
    isActive: 'Is Active',
    deleteRoleConfirm: 'Are you sure you want to delete the role "{{name}}"?',
    roleLevel: 'Role Level',
    
    // Zone management  
    zoneManagement: 'Zone Management',
    addNewZone: 'Add New Zone',
    editZone: 'Edit Zone',
    deleteZone: 'Delete Zone',
    zoneName: 'Zone Name',
    zoneNameRequired: 'Zone name is required',
    zoneId: 'Zone ID',
    minStaffPerShift: 'Min Staff per Shift',
    maxStaffPerShift: 'Max Staff per Shift',
    requiredRoles: 'Required Roles',
    preferredRoles: 'Preferred Roles',
    requiredRolesDesc: 'Roles that must be present in this zone',
    preferredRolesDesc: 'Roles that are preferred but not required',
    deleteZoneConfirm: 'Are you sure you want to delete the zone "{{name}}"?',
    reorderZone: 'Reorder Zone',
    
    // Form validation and actions
    createNew: 'Create New',
    updateExisting: 'Update Existing',
    saveConfiguration: 'Save Configuration',
    cancelChanges: 'Cancel Changes',
    preview: 'Preview',
    
    // Template types
    hotelTemplate: 'Hotel',
    restaurantTemplate: 'Restaurant', 
    resortTemplate: 'Resort',
    cafeTemplate: 'Cafe',
    barTemplate: 'Bar',
    
    // Additional translations for forms
    fillRequiredFields: 'Please fill in required fields',
    facilityWillBeConfigured: 'This facility will be configured with the following defaults:',
    noRolesYet: 'No roles configured yet',
    addFirstRole: 'Add your first role to get started',
    noZonesYet: 'No zones configured yet',
    addFirstZone: 'Add your first zone to get started',
    newShift: 'New Shift',
    cannotRemoveLastShift: 'Cannot remove the last shift',
    templateLoaded: 'Template loaded successfully',
    changesReset: 'Changes have been reset',
    fixValidationErrors: 'Please fix validation errors first',
    shiftsUpdated: 'Shifts updated successfully',
    shiftNameRequired: 'Shift {{index}}: Name is required',
    minStaffError: '{{name}}: Min staff cannot exceed max staff',
    timeRequired: '{{name}}: Start and end times are required',
    order: 'Order',
    manage: 'Manage',
    creating: 'Creating...',
    saving: 'Saving...',
  },


  swaps: {
    // ============================================================================
    // SWAP-SPECIFIC TERMS
    // ============================================================================
    swapsOverview: 'Overview',
    mySwaps: 'My Swaps',
    swapRequest: 'Swap Request',
    swapRequests: 'Swap Requests',
    myRequests: 'My Requests',
    swapManagement: 'Swap Management',
    manageSwaps: 'Manage swaps',
    swapManagementDashboard: 'Swap Management Dashboard',
    pendingSwaps: 'Pending Swaps',
    completedSwaps: 'Completed Swaps',
    urgentSwaps: 'Urgent Swaps',
    reviewSwaps: 'Review Swap Request',
    totalRequests: 'Total Requests',
    requestSwap: 'Request Swap',
    quickApproval: 'Quick Approval Queue',
    requestsForMe: 'Requests For Me',
    forMe: 'For Me',
    viewAllRequests: 'View All Requests',
    coverageRequests: 'Coverage Requests',
    noRequestsForYou: 'No requests for you',
    actionNeeded: 'Action needed',
    noActionNeeded: 'No action needed',
    teamReliability: 'Team reliability',
    timesHelped: 'Times Helped',
    everyBitHelps: 'Every bit of help counts',
    supportingTeammates: 'Supporting your teammates builds a stronger, more reliable team for everyone.',
    
    searchRequests: 'Search requests...',
    filterByStatus: 'Filter by status',
    allStatuses: 'All Statuses',
    newestFirst: 'Newest First',
    mostUrgent: 'Most Urgent',
    noSwapRequests: 'No swap requests',
    noRequestsFound: 'No requests found',
    

    // Request types and actions
    actionRequired: 'Action Required',
    myRequest: 'My Request',
    requestedForMe: 'Requested for Me',
    teamRequest: 'Team Request',
    
    // Time and shift info
    anyDay: 'Any Day',
    anyShift: 'Any Shift',
    
    // Timeline
    requested: 'Requested',
    updated: 'Updated',

    // Swap types
    specificSwap: 'Specific Swap',
    autoSwap: 'Auto Swap',
    emergencySwap: 'Emergency Swap',
    auto: 'Auto',
    
    // Swap states
    swapPending: 'Swap Pending',
    swapApproved: 'Swap Approved',
    swapDenied: 'Swap Denied',
    swapExecuted: 'Swap Executed',
    
    // Swap participants
    requestingStaff: 'Requesting Staff',
    targetStaff: 'Target Staff',
    staffMemberRequesting: 'Staff Member Requesting Swap',
    requester: 'Requester',
    
    // Swap management actions
    createSwapRequest: 'Create Swap Request',
    approveSwapRequest: 'Approve Swap Request',
    executeSwap: 'Execute Swap',
    retryAssignment: 'Retry Assignment',
    
    // Swap priorities
    highPriority: 'High Priority',
    normalPriority: 'Normal Priority',
    lowPriority: 'Low Priority',
    emergencyPriority: 'Emergency Priority',
    
    // Swap coverage
    autoCoverage: 'Auto Coverage',
    systemCoverage: 'System Coverage',
    teamCoverage: 'Team Coverage',
    findingCoverage: 'Finding Coverage',
    couldNotFindCoverage: 'Could not find coverage',
    
    // Swap-specific messages
    swapAccepted: 'Swap accepted!',
    swapExecutedSuccessfully: 'Swap executed successfully!',
    swapApprovedFinding: 'Swap approved! Finding coverage...',
    requestAutomaticCoverage: 'Request automatic coverage assignment. The system will find available staff to cover your shift.',
    manageYourShifts: 'Manage your shifts and support your team',
    
    // Swap analytics
    successRate: 'Success Rate',
    responseRate: 'Response Rate',
    completionRate: 'Completion Rate',
    reliabilityScore: 'Reliability Score',

     // Coverage and assignments
    coverageFound: 'Coverage Found',
    noCoverageFound: 'No Coverage Found',
    automaticCoverage: 'Automatic Coverage',
    manualAssignment: 'Manual Assignment',
    
    // Urgency and timing
    urgent: 'Urgent',
    emergency: 'Emergency',
    normal: 'Normal',
    low: 'Low',
    
    // Analytics and reporting
    swapAnalytics: 'Swap Analytics',
    averageResponseTime: 'Average Response Time',
    totalSwaps: 'Total Swaps',
    
    // Export and reports
    exportSwaps: 'Export Swaps',
    swapReport: 'Swap Report',
    generateReport: 'Generate Report',
    
    // Workflow and process
    workflowStatus: 'Workflow Status',
    nextStep: 'Next Step',
    processSwap: 'Process Swap',
    finalizeSwap: 'Finalize Swap',
    
    // Swap history & timeline
    swapHistory: 'Swap History',
    actionTimeline: 'Action Timeline',
    recentCompletions: 'Recent Completions',

    // SwapDetailModal specific
    swapRequestDetails: 'Swap Request Details',
    details: 'Details',
    peopleInvolved: 'People Involved',
    historyTimeline: 'History & Timeline',
    requestOverview: 'Request Overview',
    noReasonProvided: 'No reason provided',
    requestedBy: 'Requested By',
    requestDate: 'Request Date',
    facility: 'Facility',
    shiftDetails: 'Shift Details',
    reason: 'Reason',
    staffInvolved: 'Staff Involved',
    initiatedRequest: 'Initiated this request',
    hasAccepted: 'Has accepted this request',
    hasDeclined: 'Has declined this request',
    pendingResponse: 'Pending response',
    assignedStaff: 'Assigned Staff',
    systemAssigned: 'Assigned by system',
    requestHistory: 'Request History',
    noDetailedHistory: 'No detailed history available',
    mayBeDemoData: 'This may be demo data or a newly created swap request',
    unknownAction: 'Unknown action',
    unknownDate: 'Unknown date',
    declineSwapRequest: 'Decline Swap Request',
    optionalReasonForDeclining: 'Optional reason for declining...',
    cancelSwapRequest: 'Cancel Swap Request',
    reasonForCancelling: 'Reason for cancelling...',
    accepting: 'Accepting...',
    acceptAssignment: 'Accept Assignment',
    declining: 'Declining...',
    declineAssignment: 'Decline Assignment',
    swapAcceptedSuccessfully: 'Swap accepted successfully',
    swapDeclinedSuccessfully: 'Swap declined successfully',
    swapCancelledSuccessfully: 'Swap cancelled successfully',
    failedAcceptSwap: 'Failed to accept swap',
    failedDeclineSwap: 'Failed to decline swap',

    // ExportReportModal specific
    exportSwapReport: 'Export Swap Report',
    exportFormat: 'Export Format',
    dateRange: 'Date Range',
    selectDate: 'Select date',
    selectFacilities: 'Select Facilities',
    allFacilities: 'All Facilities',
    addFilters: 'Add Filters',
    urgency: 'Urgency',
    type: 'Type',
    activeFilters: 'Active Filters',
    includeFields: 'Include Fields',
    timestamps: 'Timestamps',
    history: 'History',
    exportPreview: 'Export Preview',
    facilitiesSelected: '{{count}} facility(ies)',
    customDateRange: 'Custom date range',
    allDates: 'All dates',
    totalRecords: 'total records',
    exporting: 'Exporting...',
    reportExportedSuccessfully: 'Report exported successfully!',
    failedExportReport: 'Failed to export report',

    // StaffSwapDashboard specific
    noSwapRequestsSubtitle: 'When you have requests, they will appear here',
    createFirstRequest: 'Create your first request',
    noRequestsForYouSubtitle: 'No one has requested to swap with you yet',
    youHaveSwapRequests: 'You have {{count}} swap requests waiting for your response.',
    autoAssignments: 'Automatic assignment',
    refreshData: 'Refresh data',

    // FacilityDetailModal additional keys
    pendingReview: 'Pending Review',
    swapsWaitingApproval: 'Swaps waiting for your approval',
    approvedActive: 'Approved & Active', 
    approvedSwapsInProgress: 'Approved swaps in progress',
    urgentRequests: 'Urgent Requests',
    highPrioritySwaps: 'High priority swaps',
    successfullyExecutedSwaps: 'Successfully executed swaps',
    staffMembers: 'staff members',
    recentActivity: 'Recent Activity',
    lastSevenDays: 'Last 7 Days',
    newRequests: 'New Requests',
    staffSwapInsights: 'Staff Swap Insights',
    mostActiveRequesters: 'Most Active Requesters',
    requests: 'requests',
    approvalRate: 'Approval Rate',
    swapsApprovedOrCompleted: '{{approved}} of {{total}} swaps approved or completed',
    facilitySwapManagement: 'Facility Swap Management',

    // SwapHistoryModal specific keys
    requestCreated: 'Request Created',
    swapRequestSubmitted: 'Swap request was submitted',
    managerApproved: 'Manager Approved',
    managerApprovedRequest: 'Manager approved the request',
    managerDeclined: 'Manager Declined',
    managerRejectedRequest: 'Manager rejected the request',
    targetStaffAcceptedSwap: 'Target staff accepted the swap',
    targetStaffDeclinedSwap: 'Target staff declined the swap',
    autoAssigned: 'Auto Assigned',
    systemFoundCoverageAutomatically: 'System found coverage automatically',
    swapSuccessfullyExecuted: 'Swap was successfully executed',
    requestWasCancelled: 'Request was cancelled',
    actionPerformed: 'Action performed',
    justNow: 'Just now',
    hoursAgo: '{{hours}}h ago',
    daysAgo: '{{days}}d ago',
    swapRequestHistory: 'Swap Request History',
    completeTimelineAndDetails: 'Complete timeline and details',
    swapOverview: 'Swap Overview',
    priority: 'Priority',
    noHistoryAvailable: 'No History Available',
    unableLoadHistorySwapRequest: 'Unable to load history for this swap request.',
    requestedOn: 'Requested on',
    actionBy: 'Action by',

    // Advanced serach modal
    advancedSearch: 'Advanced Search',
    searchTerms: 'Search Terms', 
    searchByStaffReasonNotes: 'Search by staff name, reason, notes...',
    selectFacility: 'Select Facility',
    selectStatus: 'Select Status',
    selectUrgency: 'Select Urgency',
    allUrgencyLevels: 'All Urgency Levels',
    selectSwapType: 'Select Swap Type',
    allSwapTypes: 'All Swap Types',
    dateFrom: 'Date From',
    dateTo: 'Date To',
    applyFilters: 'Apply Filters',

    // AnalyticsTab specific translations
    recentSwaps: 'Recent',
    thisMonth: 'This Month',
    activeFacilities: 'Active Facilities',
    urgencyBreakdown: 'Urgency Breakdown',
    facilityPerformance: 'Facility Performance',
    topPerformingFacilities: 'Top Performing Facilities',
    recentActivityTrends: 'Recent Activity Trends',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    performanceSummary: 'Performance Summary',
    overallSuccessRate: 'Overall Success Rate',
    emergencyRequests: 'Emergency Requests',
    activityIncreasing: 'Activity is increasing',
    activityStable: 'Activity is stable',

    // QuickActionsTab specific translations
    yourUpcomingShifts: 'Your Upcoming Shifts',
    noUpcomingShiftsScheduled: 'No upcoming shifts scheduled',
    teamNeedsHelp: 'Team Needs Help',
    available: 'available',
    noTeamRequestsRightNow: 'No team requests right now',
    checkBackLaterForRequests: 'Check back later for new requests that need your attention',

    // StaffSwapRequestDialog specific translations
    canWaitFewDays: 'Can wait a few days',
    standardRequest: 'Standard request',
    needCoverageSoon: 'Need coverage soon',
    urgentCoverageNeeded: 'Urgent coverage needed',
    pleaseProvideReason: 'Please provide a reason for the swap request',
    noScheduleSelected: 'No schedule selected. Please try again from the schedule page.',
    pleaseSelectStaffMember: 'Please select a staff member to swap with',
    failedSubmitSwap: 'Failed to submit swap request',
    requestSwapCoverage: 'Request Swap Coverage',
    yourCurrentAssignment: 'Your Current Assignment',
    swapType: 'Swap Type',
    systemFindsAutoCoverage: 'System finds coverage automatically',
    chooseWhoToSwapWith: 'Choose who to swap with',
    chooseStaffMemberToSwapWith: 'Choose a staff member to swap with...',
    urgencyLevel: 'Urgency Level',
    reasonForSwapRequest: 'Reason for Swap Request',
    pleaseExplainWhyNeedCovered: 'Please explain why you need this shift covered...',
    emergencyRequest: 'Emergency Request',
    emergencyRequestWarning: 'This will be marked as high priority and managers will be notified immediately.',
    submitting: 'Submitting...',
    submitSwapRequest: 'Submit Swap Request',
    noScheduleForThisWeek: 'No schedule available for this week',
    noScheduleCreatedYet: 'No schedule created for this week',
    generateNewScheduleOrAssign: 'Generate a new schedule automatically or manually create assignments.',
    

    // PersonalStatsCards specific translations
    helpfulnessScore: 'Helpfulness Score',
    noDataYet: 'No data yet',
    acceptanceRate: 'Acceptance Rate',
    noRequestsYet: 'No requests yet',
    helpingStreak: 'Helping Streak',
    startHelping: 'Start helping!',
    avgResponseTime: 'Avg Response Time',
    noResponsesYet: 'No responses yet',

    editDetails: 'Edit Details',
    cancelRequest: 'Cancel Request',
    editSwapRequest: 'Edit Swap Request',
    expiresAt: 'Expires At',
    cancellationReason: 'Cancellation Reason',
    explainWhyCancelling: 'Please explain why you are cancelling this request...',
    confirmCancel: 'Confirm Cancel',

    //Manager final approval modal
    finalApprovalRequired: 'Final Approval Required',
    swapDetails: 'Swap Details',
    originalShift: 'Original Shift',
    targetShift: 'Target Shift',
    autoAssignment: 'Auto Assignment',
    roleCompatibilityIssueDetected: 'Role Compatibility Issue Detected',
    requiredRole: 'Required Role',
    notSpecified: 'Not specified',
    assignedStaffRole: 'Assigned Staff Role',
    targetStaffRole: 'Target Staff Role',
    managerNotes: 'Manager Notes',
    addFinalNotesPlaceholder: 'Add any final notes or instructions...',
    roleOverrideOptions: 'Role Override Options',
    overrideRoleVerification: 'Override role verification and approve anyway',
    overrideRoleWarning: 'This will allow the swap to proceed despite role mismatches. Use only in emergency situations.',
    overrideJustificationRequired: 'Override Justification (Required)',
    explainRoleOverridePlaceholder: 'Explain why this role override is necessary...',
    whatHappensAfterApproval: 'What happens after approval',
    scheduleWillBeUpdated: 'The schedule will be immediately updated',
    allAffectedStaffNotified: 'All affected staff will be notified',
    swapWillBeMarkedCompleted: 'The swap will be marked as completed',
    roleOverrideWillBeLogged: 'Role override will be logged for audit purposes',
    denyFinalApproval: 'Deny Final Approval',
    approveWithOverride: 'Approve with Override',
    finalApproveAndExecute: 'Final Approve & Execute',
    bulkActions: 'Bulk Actions',
    selected: 'selected',
    selectAll: 'Select All',
    clearSelection: 'Clear Selection',
    bulkApprove: 'Bulk Approve',
    bulkDecline: 'Bulk Decline',
    someSelectedSwapsHaveRoleIssues: 'Some selected swaps have role compatibility issues that may require override.',
    bulkApproveSwaps: 'Bulk Approve Swaps',
    bulkDeclineSwaps: 'Bulk Decline Swaps',
    youAreAboutToBulkAction: 'You are about to {{action}} {{count}} swap request(s).',
    someSwapsHaveRoleCompatibilityIssues: 'Some swaps have role compatibility issues.',
    notesOptional: 'Notes (Optional)',
    addBulkActionNotesPlaceholder: 'Add notes for this bulk {{action}} action...',
    overrideRoleVerificationBulk: 'Override role verification for affected swaps',
    overrideRoleVerificationBulkDescription: 'This will approve swaps even with role mismatches',
    overrideJustification: 'Override Justification',
    explainRoleOverridesNecessaryPlaceholder: 'Explain why role overrides are necessary...',
    approveAll: 'Approve All',
    declineAll: 'Decline All',

    // Swap request modal
    morningShift: 'Morning (6AM-2PM)',
    afternoonShift: 'Afternoon (2PM-10PM)', 
    eveningShift: 'Evening (10PM-6AM)',
    week: 'Week',
    currentSchedule: 'Current Schedule',
    scheduleId: 'Schedule ID',
    selectShiftToSwap: 'Select Shift to Swap',
    specificStaff: 'Specific Staff',
    selectStaffMember: 'Select Staff Member',

    // Swap history analytics
    yourSwapAnalytics: 'Your Swap Analytics',
    myRequestsBreakdown: 'My Requests Breakdown', 
    helpingOthers: 'Helping Others',
    noResponseYet: 'No Response Yet',
    monthlyRequestTrend: 'Monthly Request Trend',
    done: 'done',
    requestUrgencyPatterns: 'Request Urgency Patterns',
    high: 'High',
    insightsRecommendations: 'Insights & Recommendations',
    greatSuccessRate: 'Great Success Rate!',
    successRateMessage: 'Your requests are being approved at a high rate. Keep up the good work!',
    teamPlayer: 'Team Player!',
    teamPlayerMessage: 'You\'re very helpful to your colleagues. Your team appreciates you!',
    considerPlanningAhead: 'Consider Planning Ahead',
    planningAheadMessage: 'You have many emergency requests. Planning shifts in advance might help reduce urgency.',
    helpTeamMore: 'Help Your Team More',
    helpTeamMoreMessage: 'Consider accepting more requests to help your colleagues when possible.',

    // SwapManagementDashboard specific translations
    pendingApproval: 'Pending Approval',
    awaitingManagerDecision: 'Awaiting manager decision',
    approvedByManager: 'Approved by manager',
    awaitingStaff: 'Awaiting Staff',
    waitingForStaffResponse: 'Waiting for staff response',
    staffAcceptedAssignment: 'Staff accepted assignment',
    readyForExecution: 'Ready for execution',
    successfullyCompleted: 'Successfully completed',
    requestWasDeclined: 'Request was declined',
    staffDeclinedAssignment: 'Staff declined the assignment',
    assignmentFailed: 'Assignment Failed',
    initialApproval: 'Initial Approval',
    readyToExecute: 'Ready to execute',
    staffResponses: 'Staff Responses',
    finalApprovalRequiredAlert: 'Final Approval Required',
    swapsReadyForExecution: '{{count}} swap{{plural}} ready for execution. Staff have accepted and are waiting for you to execute.',
    reviewNow: 'Review Now',
    searchByStaffOrReason: 'Search by staff name or reason...',
    pending: 'Pending',
    finalApproval: 'Final Approval',
    staffAction: 'Staff Action',
    inProgress: 'In Progress',
    completed: 'Completed',
    noSwapsAwaitingFinalApproval: 'No swaps awaiting final approval',
    noItemsAwaitingStaffAction: 'No items awaiting staff action',
    noSwapsInProgress: 'No swaps in progress',
    deny: 'Deny',
    decline: 'Decline',
    execute: 'Execute',
    finalApprovalExecuteSwap: 'Final Approval - Execute Swap',
    requesting: 'Requesting',
    assigned: 'Assigned',
    target: 'Target',
    readyForExecutionDescription: 'Staff have accepted and are waiting for you to execute.',
    readyForExecutionDetails: '{{name}} has accepted this assignment. Executing will update the schedule and complete the swap process.',
    executionNotesOptional: 'Execution Notes (Optional)',
    managerNotesOptional: 'Manager Notes (Optional)',
    addExecutionNotes: 'Add any notes about this execution...',
    addManagerNotes: 'Add any notes about this decision...',
    denyExecution: 'Deny Execution',

    // SwapRequestModal specific translations
    requestShiftSwap: 'Request Shift Swap',
    currentAssignment: 'Current Assignment',
    staffMemberRequestingSwap: 'Staff Member Requesting Swap',
    specificSwapDescription: 'Request to swap shifts with a specific staff member. Both parties must agree.',
    targetDay: 'Target Day',
    selectDay: 'Select day...',
    selectShift: 'Select shift...',
    staffMemberToSwapWith: 'Staff Member to Swap With',
    noStaffAssignedToShift: 'No staff assigned to the selected shift',
    autoAssignmentDescription: 'Request automatic coverage assignment. The system will find available staff to cover your shift.',
    preferredSkillsOptional: 'Preferred Skills (Optional)',
    skillsPlaceholder: 'e.g., bartending, front desk, cooking...',
    skillsHelpText: 'Comma-separated list of preferred skills for the replacement',
    avoidSpecificStaffOptional: 'Avoid Specific Staff (Optional)',
    selectStaffToAvoid: 'Select staff to avoid...',
    pleaseSelectTargetStaffAndShift: 'Please select target staff member and shift',
    pleaseSelectRequestingStaff: 'Please select which staff member is requesting the swap',
    swapRequestCreatedSuccessfully: 'Swap request created successfully!',
    failedToCreateSwapRequest: 'Failed to create swap request',

    // SwapStatusIndicator specific translations
    swapped: 'Swapped',
    urgentSwap: 'Urgent Swap',
    
    // No data states
    noSwapRequestsYet: 'No swap requests yet',
    noCompletedSwaps: 'No completed swaps',
    noPendingRequests: 'No pending requests',
    noHistoricalRecords: 'No historical records',
  },

  unavailable: {
    requestTimeOff: 'Request Time Off',
    setAvailability: 'Set availability',
  },

  workflow: {
    // Status labels - enhanced with all statuses
    requested: 'Requested',
    awaitingStaffResponse: 'Awaiting Staff Response',
    staffAccepted: 'Staff Accepted',
    finalApproval: 'Final Approval',
    completed: 'Completed',
    staffDeclined: 'Staff Declined',
    assignmentDeclined: 'Assignment Declined',
    assignmentFailed: 'Assignment Failed',
    declined: 'Declined',
    cancelled: 'Cancelled',
    
    // Action labels - complete set
    approve: 'Approve',
    decline: 'Decline',
    accept: 'Accept',
    acceptAssignment: 'Accept Assignment',
    declineAssignment: 'Decline Assignment',
    finalApprove: 'Final Approve',
    finalDecline: 'Final Decline',
    retryAssignment: 'Retry Assignment',
    manualAssign: 'Manual Assign',
    emergencyOverride: 'Emergency Override',
    viewDetails: 'View Details',
    update: 'Update',
    cancel: 'Cancel',
    
    // UI labels and sections
    workflowStatus: 'Workflow Status',
    progress: 'Progress',
    nextAction: 'Next Action',
    requiredBy: 'Required By',
    blockingIssues: 'Blocking Issues',
    estimatedCompletion: 'Estimated Completion',
    availableActions: 'Available Actions',
    roleInformation: 'Role Information',
    required: 'Required',
    assigned: 'Assigned',
    target: 'Target',
    
    // Actor types
    manager: 'Manager',
    staff: 'Staff',
    system: 'System',
    
    // Priority and type labels
    emergency: 'Emergency',
    roleOverride: 'Role Override',
    autoAssignment: 'Auto Assignment',
    specificSwap: 'Specific Swap',
    emergencyPriority: 'Emergency Priority',
    highPriority: 'High Priority',
    normalPriority: 'Normal Priority',
    lowPriority: 'Low Priority',
    
    // Stepper labels
    awaitingStaff: 'Awaiting Staff',
    done: '✓ Done',
    active: '● Active',
    
    // Success messages
    assignmentAcceptedSuccess: 'Assignment accepted successfully!',
    swapRequestApproved: 'Swap request approved!',
    swapExecutedSuccess: 'Swap executed successfully!',
    
    // Error messages
    actionNotAvailable: 'Action not available - no API client configured',
    processingAction: 'Processing {{action}}...',
    actionNotImplemented: 'Action "{{action}}" is not yet implemented',
    actionFailed: 'Failed to {{action}}',
    cannotAcceptSwap: 'Cannot accept swap in status: {{status}} with type: {{type}}',
    cannotDeclineSwap: 'Cannot decline swap in status: {{status}} with type: {{type}}',
    failedAcceptAssignment: 'Failed to accept assignment',
    failedDeclineAssignment: 'Failed to decline assignment',
    
    // PotentialAssignmentCard labels
    coverageAssignment: 'Coverage Assignment',
    needsResponse: 'Needs Response',
    youveBeenAssignedToCover: 'You\'ve been assigned to cover for {{name}}',
    zone: 'Zone',
    roleOverrideApplied: 'Role Override Applied',
    notesOptional: 'Notes (optional)',
    addNotesPlaceholder: 'Add any notes about your availability or concerns...',
    accepting: 'Accepting...',
    declining: 'Declining...',
    
    // Day names
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    day: 'Day {{day}}',
    
    // Shift names
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    shift: 'Shift {{shift}}',
  },

  notifications: {
    // ============================================================================
    // NOTIFICATION-SPECIFIC TERMS
    // ============================================================================
    notifications: 'Notifications',
    notificationSettings: 'Notification Settings',
    notificationPreferences: 'Notification Preferences',
    pushOn: 'Push On',
    pushOff: 'Push Off', 
    enablePushNotifications: 'Enable Push Notifications',
    getNotifiedEvenWhenClosed: 'Get notified even when the app is closed',
    enabling: 'Enabling...',
    receivingNotificationsWhenClosed: 'Receiving notifications when app is closed',
    enableToGetNotificationsWhenClosed: 'Enable to get notifications when app is closed',
    connected: 'Connected',
    setWhatsappNumberToReceive: 'Set WhatsApp number to receive notifications',
    advancedSettings: 'Advanced Settings',
    manageNotificationTypesAndPreferences: 'Manage notification types and preferences',
    stayUpdated: 'Stay Updated',
    maybeLater: 'Maybe Later',
    unreadNotifications: '{{count}} unread notifications',
    goToTop: 'Go to top',

    // Priority and status
    allPriorities: 'All Priorities',
    critical: 'Critical',

    // Time expressions
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago', 
    daysAgo: 'd ago',

    // States and counts
    new: 'new',
    newPlural: 'new',
    youreAllCaughtUp: "You're all caught up!",
    loadingNotifications: 'Loading notifications...',
    failedToLoad: 'Failed to load notifications',
    failedToMarkAllAsRead: 'Failed to mark all as read',
    
    // Notification types
    pushNotifications: 'Push Notifications',
    emailNotifications: 'Email Notifications',
    whatsappNotifications: 'WhatsApp Notifications',
    desktopNotifications: 'Desktop Notifications',
    
    // Notification content types
    scheduleChanges: 'Schedule Changes',
    schedulePublished: 'Schedule Published',
    shiftReminders: 'Shift Reminders',
    swapRequests: 'Swap Requests',
    emergencyCoverage: 'Emergency Coverage',
    
    // Notification states
    enableNotifications: 'Enable Notifications',
    notificationsEnabled: 'Notifications enabled!',
    notificationsBlocked: 'Notifications are blocked',
    
    // Notification actions
    markAllRead: 'Mark all read',
    markRead: 'Mark Read',
    
    // Notification messages
    youHaveNew: 'You have a new notification',
    noNotifications: 'No notifications',
    getNotifiedAbout: 'Get notified about schedule changes and swap requests even when the app is closed.',
    whenNewSchedules: 'When new schedules are published',
    whenYourSchedule: 'When your schedule is modified',

    // SwapNotificationDialog specific translations
    managerSwapAssignment: 'Manager Swap Assignment',
    notifyStaffManagerInitiated: 'Notify staff about manager-initiated swap',
    staffSwapRequest: 'Staff Swap Request',
    requestSwapBetweenStaff: 'Request swap between staff members',
    swapRequestApproved: 'Swap Request Approved',
    notifyAboutApprovedSwap: 'Notify about approved swap request',
    swapRequestDenied: 'Swap Request Denied',
    notifyAboutDeniedSwap: 'Notify about denied swap request',
    swapNotification: 'Swap Notification',
    sendSwapRelatedNotification: 'Send swap-related notification',
    priorityAndRecipients: 'Priority & Recipients',
    priority: 'PRIORITY',
    notificationChannels: 'Notification Channels',
    inAppNotifications: 'In-App Notifications',
    showNotificationInApp: 'Show notification in the app bell icon',
    sendMobilePushNotifications: 'Send mobile push notifications with action links',
    whatsappMessages: 'WhatsApp Messages',
    sendWhatsappWithDetails: 'Send WhatsApp messages with swap details and action links',
    additionalMessageOptional: 'Additional Message (Optional)',
    addAdditionalContext: 'Add any additional context or instructions...',
    emergencyHighBypassPreferences: 'Emergency and High priority bypass user notification preferences',
    criticalPriorityNotice: 'Critical Priority Notice',
    notificationSentRegardlessPreferences: 'This notification will be sent regardless of individual staff notification preferences due to its {{priority}} priority level.',
    sending: 'Sending...',
    sendNotifications: 'Send Notifications',

    // notifications settings specific
    whenSomeoneRequestsSwap: 'When someone requests to swap shifts with you',
    whenSwapRequestApproved: 'When your swap request is approved',
    whenSwapRequestDenied: 'When your swap request is denied',
    remindersBeforeShifts: 'Reminders before your shifts',
    urgentCoverageRequests: 'Urgent coverage requests',
    swapAssignments: 'Swap Assignments',
    whenAssignedToCoverShift: 'When you are assigned to cover a shift',
    loadingSettings: 'Loading settings...',
    manageHowAndWhenReceive: 'Manage how and when you receive notifications',
    receiveNotificationsEvenWhenClosed: 'Receive notifications even when the app is closed',
    youWillReceivePushNotifications: 'You will receive push notifications on this device',
    receiveImportantViaWhatsapp: 'Receive important notifications via WhatsApp',
    whatsappNumber: 'WhatsApp Number',
    includeCountryCode: 'Include country code (e.g., +1 for USA, +44 for UK)',
    whatsappConfigured: 'WhatsApp configured:',
    whatsappNumberUpdated: 'WhatsApp number updated',
    failedToUpdateWhatsapp: 'Failed to update WhatsApp number',
    notificationTypes: 'Notification Types',
    chooseHowToReceiveNotifications: 'Choose how you want to receive different types of notifications',
    channelTypes: 'Channel Types:',
    inApp: 'In-App',
    push: 'Push',
    setWhatsappNumberToEnable: '* Set your WhatsApp number above to enable WhatsApp notifications'
  },

  settings: {
    // ============================================================================
    // SETTINGS & CONFIGURATION
    // ============================================================================
    
    // Main sections
    settings: 'Settings',
    system: 'System',
    systemSettings: 'System Settings',
    notifications: 'Notifications',
    security: 'Security',
    
    // Page headers and descriptions
    manageSystemConfiguration: 'Manage your system configuration, notifications, and preferences',
    unsavedChanges: 'Unsaved Changes',
    resetToDefaults: 'Reset to Defaults',
    resetToDefaultsConfirm: 'Are you sure you want to reset all settings to defaults? This cannot be undone.',
    myProfile: 'My Profile',
    
    // Company & Localization
    companyAndLocalization: 'Company & Localization',
    companyName: 'Company Name',
    companyNamePlaceholder: 'Enter your company name',
    timezone: 'Timezone',
    selectTimezone: 'Select timezone',
    europeRome: 'Europe/Rome (GMT+1)',
    europeLondon: 'Europe/London (GMT+0)',
    americaNewYork: 'America/New_York (GMT-5)',
    americaLosAngeles: 'America/Los_Angeles (GMT-8)',
    currency: 'Currency',
    selectCurrency: 'Select currency',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    format24h: '24-hour format',
    format12h: '12-hour format',
    
    // Time units
    hours: '{{count}} hours',
    hour: '{{count}} hour',
    minutes: '{{count}} minutes',
    days: '{{count}} days',
    week: '{{count}} week',
    year: '{{count}} year',
    
    // Scheduling Settings
    schedulingSettings: 'Scheduling Settings',
    defaultShiftDuration: 'Default Shift Duration',
    defaultMaxWeeklyHours: 'Default Max Weekly Hours',
    conflictDetection: 'Conflict Detection',
    conflictDetectionDesc: 'Check for scheduling conflicts',
    balanceWorkload: 'Balance Workload',
    balanceWorkloadDesc: 'Distribute shifts evenly among staff',
    allowOvertime: 'Allow Overtime',
    allowOvertimeDesc: 'Permit overtime scheduling',
    
    // Email Settings
    emailSettings: 'Email Settings',
    sendEmailNotifications: 'Send Email Notifications',
    sendEmailNotificationsDesc: 'Enable email notifications for staff',
    sendEmailNotificationsWithPDF: 'Send Email Notifications with PDF',
    sendEmailNotificationsWithPDFDesc: 'Include PDF attachments in email notifications',
    smtpServer: 'SMTP Server',
    smtpPort: 'SMTP Port',
    smtpUsername: 'SMTP Username',
    smtpUsernamePlaceholder: 'your-email@example.com',
    smtpPassword: 'SMTP Password',
    smtpPasswordPlaceholder: 'Your email password or app password',
    fromEmail: 'From Email',
    fromEmailPlaceholder: 'noreply@yourcompany.com',
    testConnection: 'Test Connection',
    
    // WhatsApp Settings
    whatsappSettings: 'WhatsApp Settings',
    sendWhatsappMessages: 'Send WhatsApp Messages',
    sendWhatsappMessagesDesc: 'Enable WhatsApp notifications via Twilio',
    twilioAccountSid: 'Twilio Account SID',
    twilioAuthToken: 'Twilio Auth Token',
    twilioAuthTokenPlaceholder: 'Your Twilio auth token',
    twilioWhatsappNumber: 'Twilio WhatsApp Number',
    
    // Push Notifications
    pushNotifications: 'Push Notifications',
    sendPushNotifications: 'Send Push Notifications',
    sendPushNotificationsDesc: 'Enable browser push notifications',
    firebaseServerKey: 'Firebase Server Key',
    firebaseServerKeyPlaceholder: 'Your Firebase server key',
    firebaseCredentialsRequired: 'Firebase credentials are required for push notifications. Contact your administrator to set up Firebase credentials.',
    
    // Default Notification Types
    defaultNotificationTypes: 'Default Notification Types',
    schedulePublished: 'Schedule Published',
    schedulePublishedDesc: 'Notify when schedules are published',
    swapRequests: 'Swap Requests',
    swapRequestsDesc: 'Notify about shift swap requests',
    urgentSwaps: 'Urgent Swaps',
    urgentSwapsDesc: 'Notify about urgent swap requests',
    shiftReminders: 'Shift Reminders',
    shiftRemindersDesc: 'Send reminders before shifts start',
    
    // Security Settings
    securityPolicies: 'Security Policies',
    requireTwoFactor: 'Require Two-Factor Authentication',
    requireTwoFactorDesc: 'Require 2FA for all user accounts',
    sessionTimeout: 'Session Timeout',
    minimumPasswordLength: 'Minimum Password Length',
    requirePasswordComplexity: 'Require Password Complexity',
    requirePasswordComplexityDesc: 'Require uppercase, lowercase, numbers, and special characters',
    
    // Audit & Logging
    auditAndLogging: 'Audit & Logging',
    enableAuditLogging: 'Enable Audit Logging',
    enableAuditLoggingDesc: 'Track all user actions and system changes',
    logRetentionDays: 'Log Retention Days',
    logSensitiveData: 'Log Sensitive Data',
    logSensitiveDataDesc: 'Include sensitive information in audit logs (not recommended)',
  },

  profile: {
    // ============================================================================
    // PROFILE PAGE SPECIFIC TERMS
    // ============================================================================
    
    // Page header and navigation
    myProfile: 'My Profile',
    managePersonalInformation: 'Manage your personal information, preferences, and account settings',
    systemSettings: 'System Settings',
    backToProfile: 'Back to Profile',
    
    // Tab navigation
    personalTab: 'Personal',
    avatarTab: 'Avatar',
    preferencesTab: 'Preferences',
    notificationsTab: 'Notifications',
    linkAccounts: "Linked Accounts",
    
    // Personal Information section
    basicInformation: 'Basic Information',
    displayName: 'Display Name',
    displayNamePlaceholder: 'How you\'d like to be called',
    bio: 'Bio',
    bioPlaceholder: 'Tell us about yourself...',
    jobTitle: 'Job Title',
    jobTitlePlaceholder: 'e.g., Front Desk Manager',
    department: 'Department',
    departmentPlaceholder: 'e.g., Guest Services',
    contactInformation: 'Contact Information',
    emailAddress: 'Email Address',
    emailCannotBeChanged: 'Email cannot be changed from this page',
    phoneNumber: 'Phone Number',
    phoneNumberPlaceholder: '+1 (555) 123-4567',
    savePersonalInformation: 'Save Personal Information',
    
    // Avatar section
    avatarPreview: 'Avatar Preview',
    currentAvatarType: 'Current avatar type:',
    avatarOptions: 'Avatar Options',
    avatarType: 'Avatar Type',
    initials: 'Initials',
    useInitialsAsAvatar: 'Use your initials as avatar',
    gravatar: 'Gravatar',
    useGlobalGravatarImage: 'Use your global Gravatar image',
    customImage: 'Custom Image',
    uploadYourOwnPhoto: 'Upload your own photo',
    avatarColor: 'Avatar Color',
    uploadImage: 'Upload Image',
    clickToUpload: 'Click to upload',
    orDragAndDrop: 'or drag and drop',
    pngJpgGifUpTo5mb: 'PNG, JPG, GIF up to 5MB',
    uploading: 'Uploading...',
    
    // Preferences section
    appearance: 'Appearance',
    theme: 'Theme',
    language: 'Language',
    regionalSettings: 'Regional Settings',
    timezone: 'Timezone',
    currency: 'Currency',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    savePreferences: 'Save Preferences',
    
    // Theme options
    systemTheme: 'System',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    
    // Date format options
    dateFormatUS: 'MM/DD/YYYY (US)',
    dateFormatEU: 'DD/MM/YYYY (EU)',
    dateFormatISO: 'YYYY-MM-DD (ISO)',
    
    // Time format options
    timeFormat12h: '12 Hour (AM/PM)',
    timeFormat24h: '24 Hour',
    
    // Notifications section
    notificationPreferences: 'Notification Preferences',
    desktopNotifications: 'Desktop Notifications',
    showNotificationsInBrowser: 'Show notifications in your browser',
    soundNotifications: 'Sound Notifications',
    playSoundForImportantNotifications: 'Play sound for important notifications',
    quietHours: 'Quiet Hours',
    disableNotificationsDuringHours: 'Disable notifications during specific hours',
    startTime: 'Start Time',
    endTime: 'End Time',
    weekendNotifications: 'Weekend Notifications',
    receiveNotificationsOnWeekends: 'Receive notifications on weekends',
    saveNotificationSettings: 'Save Notification Settings',
    
    // Loading and error states
    loadingProfile: 'Loading profile...',
    pleaseSelectValidImageFile: 'Please select a valid image file',
    fileSizeMustBeLessThan5mb: 'File size must be less than 5MB',
    avatarUploadedSuccessfully: 'Avatar uploaded successfully!',
    
    // General profile actions
    profileUpdatedSuccessfully: 'Profile updated successfully!',
    failedToUpdateProfile: 'Failed to update profile',
    preferencesUpdatedSuccessfully: 'Preferences updated successfully!',
    failedToUpdatePreferences: 'Failed to update preferences',
    notificationSettingsUpdated: 'Notification settings updated successfully!',
    failedToUpdateNotificationSettings: 'Failed to update notification settings',
    
    // Avatar specific messages
    avatarSettingsUpdated: 'Avatar settings updated successfully!',
    failedToUpdateAvatarSettings: 'Failed to update avatar settings',
    avatarDeleted: 'Avatar deleted successfully!',
    failedToDeleteAvatar: 'Failed to delete avatar',
    
    // Validation messages
    displayNameTooLong: 'Display name must be less than 100 characters',
    bioTooLong: 'Bio must be less than 500 characters',
    invalidPhoneNumber: 'Please enter a valid phone number',
    invalidTimeFormat: 'Please enter a valid time (HH:MM)',
  },

  status: {
    // ============================================================================
    // STATUS TERMS (could be moved to common if reused)
    // ============================================================================
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    urgent: 'Urgent',
    completed: 'Completed',
    cancelled: 'Cancelled',
    inProgress: 'In Progress',
    awaitingApproval: 'Awaiting Approval',
    readyForExecution: 'Ready for Execution',
    executed: 'Executed',
    staffAccepted: 'Staff Accepted',
    staff_accepted: 'staff accepted',
    potential_assignment: 'potential assignment'

  },

  messages: {
    // ============================================================================
    // SYSTEM MESSAGES (specific message templates)
    // ============================================================================
    actionCompletedSuccessfully: 'Action completed successfully!',
    connectionTestSuccessful: 'Connection test successful!',
    importComplete: 'Import complete!',
    dataRefreshed: 'Data refreshed!',
    
    // Specific error messages
    importFailed: 'Import Failed',
    searchFailed: 'Search failed',
    
    // Alert types
    alert: 'Alert',
    highAlert: 'High Alert',
    criticalPriorityNotice: 'Critical Priority Notice',
  },

  gamification: {
    // Main UI Text
    teamReliabilityRecognition: 'Team Reliability Recognition',
    yourEarnedRecognition: 'Your earned recognition:',
    nextRecognitionToEarn: 'Next recognition to earn:',
    
    // Badge Names
    reliableResponder: 'Reliable Responder',
    teamPlayer: 'Team Player',
    helpingHand: 'Helping Hand',
    streakMaster: 'Streak Master',
    alwaysThere: 'Always There',
    teamHero: 'Team Hero',
    
    // Badge Descriptions
    reliableResponderDesc: 'Responds to requests within 2 hours',
    teamPlayerDesc: 'Accepts 80%+ of swap requests',
    helpingHandDesc: 'Helped colleagues 5+ times',
    streakMasterDesc: 'Current helping streak of 5+',
    alwaysThereDesc: 'Accepts 100% of requests',
    teamHeroDesc: 'Exceptional team support (90+ rating)',
    daysNeedHelp: 'Days that often need help:',
    shiftsNeedSupport: 'Shifts that need more support:',

    teamReliability: 'Team Reliability',
    timesHelped: 'Times Helped',
    inARow: 'in a row',
    
    // Performance Level Badges
    exceptional: 'Exceptional',
    reliable: 'Reliable',
    developing: 'Developing',
    building: 'Building',
    
    // Encouragement Messages
    valuedTeamMember: '🌟 You\'re a valued team member!',
    buildingRelationships: '💪 Building strong team relationships',
    everyHelpMatters: '🤝 Every bit of help matters to the team',
  },

  availability: {
    // Modal Title
    requestTimeOff: 'Request Time Off',
    
    // Request Type
    requestType: 'Request Type',
    singleDate: 'Single Date',
    consecutiveDays: 'Multiple consecutive days',
    selectDate: 'Select Date',
    
    // Time Patterns
    timePeriod: 'Time Period',
    morningShiftTime: '6:00 AM - 2:00 PM',
    afternoonShiftTime: '2:00 PM - 10:00 PM', 
    eveningShiftTime: '10:00 PM - 6:00 AM',
    entireDay: 'Entire 24-hour period',
    setTimeRange: 'Set specific time range',
    
    // Recurring Option
    recurringUnavailability: 'Make this a recurring unavailability (same time every week)',
    
    // Reason Section
    reasonOptional: 'Reason (Optional)',
    reasonPlaceholder: 'Optional: Let your manager know why you need this time off...',
    
    // Info Notes
    infoNote1: 'Time off requests affect future scheduling',
    infoNote2: 'Your manager will be notified of this request',
    infoNote3: 'This does not automatically cancel existing shifts',
    infoNote4: 'For existing shifts, use the swap system instead',
    
    // Buttons
    submitRequest: 'Submit Request',
    submitting: 'Submitting...',
    
    // Error Messages
    selectDateError: 'Please select a date',
    selectDatesError: 'Please select start and end dates',
    endTimeAfterStartError: 'End time must be after start time',
    
    // Success Messages
    requestSubmittedSuccess: 'Time off request submitted successfully!',
    requestSubmitError: 'Failed to submit time off request',
  },

  test: {
    // ============================================================================
    // TEST/DEBUG TERMS
    // ============================================================================
    welcome: 'Welcome to our app!',
    currentLanguage: 'Current language',
    switchLanguage: 'Switch language',
    translationTest: 'Translation Test',
  },

} as const;

export default en;