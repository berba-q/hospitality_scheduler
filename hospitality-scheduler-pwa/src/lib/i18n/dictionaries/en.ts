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
    // Show/Hide actions
    show: 'Show',
    hide: 'Hide',
    showAll: 'Show All',
    hideAll: 'Hide All',
    
    // Selection actions
    select: 'Select',
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
    unknown: 'Unknown',
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
    
    // Staff-specific messages
    manageYourTeam: 'Manage your team and facilities',
    couldNotLink: 'Could not link your user account to a staff profile. Please contact your manager.',
    youNeedManager: 'You need manager permissions to access staff management.',

    // Modal titles and headers
    editStaffMember: 'Edit {{name}}',
    basicInformation: 'Basic Information',
    addNewStaffMember: 'Add New Staff Member',
    adding: 'Adding...',
    
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