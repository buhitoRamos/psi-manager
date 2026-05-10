describe('appConfig', () => {
  let config;

  beforeAll(() => {
    config = require('../config/appConfig');
  });

  test('exports DATABASE_CONFIG with url', () => {
    expect(config.DATABASE_CONFIG).toBeDefined();
    expect(config.DATABASE_CONFIG).toHaveProperty('url');
  });

  test('exports DATABASE_CONFIG with anonKey', () => {
    expect(config.DATABASE_CONFIG).toHaveProperty('anonKey');
  });

  test('exports API_CONFIG with serverUrl', () => {
    expect(config.API_CONFIG).toBeDefined();
    expect(config.API_CONFIG).toHaveProperty('serverUrl');
  });

  test('exports AUTH_CONFIG', () => {
    expect(config.AUTH_CONFIG).toBeDefined();
    expect(config.AUTH_CONFIG).toHaveProperty('jwtSecret');
    expect(config.AUTH_CONFIG).toHaveProperty('sessionDuration');
  });

  test('exports GOOGLE_CALENDAR_CONFIG', () => {
    expect(config.GOOGLE_CALENDAR_CONFIG).toBeDefined();
    expect(config.GOOGLE_CALENDAR_CONFIG).toHaveProperty('apiKey');
    expect(config.GOOGLE_CALENDAR_CONFIG).toHaveProperty('clientId');
  });

  test('exports ENVIRONMENT', () => {
    expect(config.ENVIRONMENT).toBeDefined();
    expect(config.ENVIRONMENT).toHaveProperty('isDevelopment');
    expect(config.ENVIRONMENT).toHaveProperty('appVersion');
  });

  test('exports default config object', () => {
    expect(config.default).toBeDefined();
    expect(config.default).toHaveProperty('database');
    expect(config.default).toHaveProperty('api');
  });
});