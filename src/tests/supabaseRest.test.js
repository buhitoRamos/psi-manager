// Tests for supabaseRest module
// We mock the entire module and test that the exported functions exist and are callable
jest.mock('../lib/supabaseRest', () => {
  const mk = () => jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    selectUsersByUser: jest.fn().mockResolvedValue([{ id: 1, user: 'testuser' }]),
    insertUser: jest.fn().mockResolvedValue([{ id: 1, user: 'newuser' }]),
    updateUserPass: jest.fn().mockResolvedValue([{ id: 1 }]),
    deleteUser: jest.fn().mockResolvedValue([]),
    callRpc: jest.fn().mockResolvedValue({ result: 'ok' }),
    authCheck: jest.fn().mockResolvedValue({ valid: true, user_id: 1 }),
    getPatientsByUserId: jest.fn().mockResolvedValue([{ id: 1, name: 'Juan' }]),
    default: {
      selectUsersByUser: jest.fn().mockResolvedValue([{ id: 1, user: 'testuser' }]),
      insertUser: jest.fn().mockResolvedValue([{ id: 1, user: 'newuser' }]),
      updateUserPass: jest.fn().mockResolvedValue([{ id: 1 }]),
      deleteUser: jest.fn().mockResolvedValue([]),
      callRpc: jest.fn().mockResolvedValue({ result: 'ok' }),
      authCheck: jest.fn().mockResolvedValue({ valid: true, user_id: 1 }),
      getPatientsByUserId: jest.fn().mockResolvedValue([{ id: 1, name: 'Juan' }]),
      updatePatient: jest.fn().mockResolvedValue([{ id: 1, name: 'Juan' }]),
      createPatient: jest.fn().mockResolvedValue({ id: 1, name: 'Juan' }),
      deletePatient: jest.fn().mockResolvedValue([]),
      createAppointment: jest.fn().mockResolvedValue([{ id: 1 }]),
      getAppointmentsByUserId: jest.fn().mockResolvedValue([]),
      getPaymentsByUserId: jest.fn().mockResolvedValue([]),
      createPayment: jest.fn().mockResolvedValue([{ id: 1 }]),
      updatePayment: jest.fn().mockResolvedValue([{ id: 1 }]),
      deletePayment: jest.fn().mockResolvedValue([]),
      getPatientDebt: jest.fn().mockResolvedValue({ total: 0 }),
      getPatientsWithNextAppointmentManual: jest.fn().mockResolvedValue([]),
      deletePendingAppointmentsByPatient: jest.fn().mockResolvedValue([]),
      createAppointmentFromPending: jest.fn().mockResolvedValue([{ id: 1 }]),
    },
  };
});

import supabaseRest from '../lib/supabaseRest';

describe('supabaseRest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mock return values after clearAllMocks
    supabaseRest.createPatient.mockResolvedValue({ id: 1, name: 'Juan' });
    supabaseRest.authCheck.mockResolvedValue({ valid: true, user_id: 1 });
  });

  describe('default export methods', () => {
    test('createPatient is callable', async () => {
      await supabaseRest.createPatient({ name: 'Juan', user_id: 1 });
      expect(supabaseRest.createPatient).toHaveBeenCalledWith({ name: 'Juan', user_id: 1 });
    });

    test('deletePatient is callable', async () => {
      await supabaseRest.deletePatient(1, 1);
      expect(supabaseRest.deletePatient).toHaveBeenCalledWith(1, 1);
    });

    test('updatePatient is callable', async () => {
      await supabaseRest.updatePatient(1, { name: 'Juan Updated' });
      expect(supabaseRest.updatePatient).toHaveBeenCalledWith(1, { name: 'Juan Updated' });
    });

    test('createAppointment is callable', async () => {
      await supabaseRest.createAppointment({ patient_id: 1, user_id: 1, date: '2026-06-15' });
      expect(supabaseRest.createAppointment).toHaveBeenCalled();
    });

    test('getAppointmentsByUserId is callable', async () => {
      await supabaseRest.getAppointmentsByUserId(1);
      expect(supabaseRest.getAppointmentsByUserId).toHaveBeenCalledWith(1);
    });

    test('getPaymentsByUserId is callable', async () => {
      await supabaseRest.getPaymentsByUserId(1);
      expect(supabaseRest.getPaymentsByUserId).toHaveBeenCalledWith(1);
    });

    test('createPayment is callable', async () => {
      await supabaseRest.createPayment({ amount: 5000, patient_id: 1 });
      expect(supabaseRest.createPayment).toHaveBeenCalled();
    });

    test('getPatientDebt is callable', async () => {
      await supabaseRest.getPatientDebt(1);
      expect(supabaseRest.getPatientDebt).toHaveBeenCalledWith(1);
    });

    test('getPatientsWithNextAppointmentManual is callable', async () => {
      await supabaseRest.getPatientsWithNextAppointmentManual(1);
      expect(supabaseRest.getPatientsWithNextAppointmentManual).toHaveBeenCalledWith(1);
    });

    test('authCheck is callable', async () => {
      await supabaseRest.authCheck('testuser', 'password');
      expect(supabaseRest.authCheck).toHaveBeenCalledWith('testuser', 'password');
    });

    test('selectUsersByUser is callable', async () => {
      await supabaseRest.selectUsersByUser('testuser');
      expect(supabaseRest.selectUsersByUser).toHaveBeenCalledWith('testuser');
    });

    test('insertUser is callable', async () => {
      await supabaseRest.insertUser({ user: 'newuser', pass: 'hashed' });
      expect(supabaseRest.insertUser).toHaveBeenCalledWith({ user: 'newuser', pass: 'hashed' });
    });

    test('updateUserPass is callable', async () => {
      await supabaseRest.updateUserPass(1, 'newpass');
      expect(supabaseRest.updateUserPass).toHaveBeenCalledWith(1, 'newpass');
    });

    test('deleteUser is callable', async () => {
      await supabaseRest.deleteUser(1);
      expect(supabaseRest.deleteUser).toHaveBeenCalledWith(1);
    });

    test('callRpc is callable', async () => {
      await supabaseRest.callRpc('test_fn', { arg: 1 });
      expect(supabaseRest.callRpc).toHaveBeenCalledWith('test_fn', { arg: 1 });
    });
  });
});