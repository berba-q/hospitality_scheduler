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
  },

  common: {
    // ============================================================================
    // CORE ACTIONS (reusable across all components)
    // ============================================================================
    save: 'Save',
    saved: 'Saved',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    viewAll: 'View All',
    viewDetails: 'View Details',
    viewHistory: 'View History',
    viewMore: 'View More',
    add: 'Add',
    create: 'Create',
    update: 'Update',
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
    
    // Show/Hide actions
    show: 'Show',
    hide: 'Hide',
    showAll: 'Show All',
    hideAll: 'Hide All',
    
    // Selection actions
    select: 'Select',
    selectAll: 'Select All',
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
    import: 'Import',
    settings: 'Settings',
    config: 'Configuration',
    options: 'Options',
    preferences: 'Preferences',
    
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
    noData: 'No data',
    noResults: 'No results',
    notFound: 'Not found',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    
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
    unknown: 'Unknown',
    none: 'None',
    all: 'All',
    
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
    
    // Time units
    hours: 'hours',
    minutes: 'minutes',
    days: 'days',
    weeks: 'weeks',
    months: 'months',
    
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
    // SCHEDULE-SPECIFIC TERMS (not reusable elsewhere)
    // ============================================================================
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
    
    // Schedule-specific time periods
    todayShifts: "Today's Shifts",
    
    // Schedule creation/management
    createSchedule: 'Create Schedule',
    publishSchedule: 'Publish Schedule',
    publishChanges: 'Publish Changes',
    generateSchedule: 'Generate Schedule',
    smartGenerate: 'Smart Generate',
    
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
    
    // Configuration
    scheduleConfiguration: 'Schedule Configuration',
    schedulingConstraints: 'Scheduling Constraints',
    
    // Messages specific to scheduling
    yourManagerHasntCreated: "Your manager hasn't created a schedule for this period yet.",
    viewYourWorkSchedule: 'View your work schedule and request shift swaps',
    chooseFacilityFromDropdown: 'Choose a facility from the dropdown above to view and manage schedules',
    loadingScheduleData: 'Loading schedule data...',
    
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
    
    // Staff roles
    manager: 'Manager',
    assistantManager: 'Assistant Manager',
    frontDeskAgent: 'Front Desk Agent',
    lineCook: 'Line Cook',
    sousChef: 'Sous Chef',
    
    // Staff-specific actions
    searchStaff: 'Search staff...',
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
    
    // Staff performance
    staffPerformanceLeaderboard: 'Staff Performance Leaderboard',
    teamPlayer: 'Team Player',
    topPerformer: 'Top performer',
    coverageHeroes: 'Coverage Heroes',
    
    // Staff-specific messages
    manageYourTeam: 'Manage your team and facilities',
    couldNotLink: 'Could not link your user account to a staff profile. Please contact your manager.',
    youNeedManager: 'You need manager permissions to access staff management.',
  },

  facilities: {
    // ============================================================================
    // FACILITIES-SPECIFIC TERMS
    // ============================================================================
    facilityManagement: 'Facilities Management',
    addNewFacility: 'Add New Facility',
    createFacility: 'Create Facility',
    
    // Facility types
    fullServiceHotel: 'Full-service hotel with front desk, housekeeping, and guest services',
    largeResortProperty: 'Large resort property with multiple amenities and services',
    diningEstablishmentWith: 'Dining establishment with kitchen, service, and bar operations',
    barLoungeWith: 'Bar or lounge with beverage service and light food',
    coffeeShopCasual: 'Coffee shop or casual dining with counter service',
    
    // Facility areas/zones
    frontDesk: 'Front Desk',
    diningRoom: 'Dining Room',
    hostStation: 'Host Station',
    poolArea: 'Pool Area',
    prepArea: 'Prep Area',
    seatingArea: 'Seating Area',
    
    // Zone management
    zonesDepartments: 'Zones & Departments',
    addNewZone: 'Add New Zone',
    unnamedZone: 'Unnamed Zone',
    
    // Role management
    defaultRoles: 'Default Roles',
    addNewRole: 'Add New Role',
    
    // Facility-specific messages
    briefDescriptionThe: 'Brief description of the facility...',
    noFacilitiesFound: 'No facilities found',
    activeFacilities: 'Active Facilities',
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
    
    // Swap history & timeline
    swapHistory: 'Swap History',
    actionTimeline: 'Action Timeline',
    recentCompletions: 'Recent Completions',
    
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

  notifications: {
    // ============================================================================
    // NOTIFICATION-SPECIFIC TERMS
    // ============================================================================
    notifications: 'Notifications',
    notificationSettings: 'Notification Settings',
    notificationPreferences: 'Notification Preferences',
    
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