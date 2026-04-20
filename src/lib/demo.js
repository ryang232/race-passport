// DEMO MODE — remove before launch
// Any page that checks this email will bypass real auth
export const DEMO_EMAIL = 'demo@racepassport.app'
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_FIRST_NAME = 'Ryan'
export const DEMO_LAST_NAME = 'Groene'
export const DEMO_DOB = '1990-04-22'

export const isDemo = (email) =>
  email?.trim().toLowerCase() === DEMO_EMAIL.toLowerCase()
