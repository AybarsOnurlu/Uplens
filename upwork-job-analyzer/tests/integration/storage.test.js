import { StorageHelper, DEFAULT_USER_PROFILE, STORAGE_KEYS } from '../../utils/storage.js';

describe('StorageHelper (storage.js) - Integration with Mocked Chrome API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUserProfile returns default profile if storage is empty', async () => {
    global.chrome.storage.local.get.mockResolvedValue({});

    const profile = await StorageHelper.getUserProfile();
    expect(profile).toEqual(DEFAULT_USER_PROFILE);
    expect(global.chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.USER_PROFILE);
  });

  it('saveUserProfile saves to chrome.storage', async () => {
    global.chrome.storage.local.set.mockResolvedValue();

    const newProfile = { ...DEFAULT_USER_PROFILE, language: 'en' };
    await StorageHelper.saveUserProfile(newProfile);

    expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
      { [STORAGE_KEYS.USER_PROFILE]: newProfile }
    );
  });
});
