// Test setup - mocks for Figma API and fetch

// Store callbacks for testing
export const mockCallbacks = {
  onMessage: null as ((msg: any) => Promise<void>) | null,
  onSelectionChange: null as (() => void) | null,
  postedMessages: [] as any[],
};

// Mock text node factory
export function createMockTextNode(overrides: Partial<{
  id: string;
  name: string;
  characters: string;
  type: string;
  locked: boolean;
  hasMissingFont: boolean;
  fontName: any;
}> = {}): any {
  return {
    id: overrides.id || 'node-1',
    name: overrides.name || 'test-node',
    characters: overrides.characters || 'Test text',
    type: overrides.type || 'TEXT',
    locked: overrides.locked || false,
    hasMissingFont: overrides.hasMissingFont || false,
    fontName: overrides.fontName || { family: 'Arial', style: 'Regular' },
    getRangeFontName: jest.fn().mockReturnValue({ family: 'Arial', style: 'Regular' }),
  };
}

// Mock storage
const mockStorage: Record<string, any> = {};

// Create the figma mock
const figmaMock = {
  showUI: jest.fn(),
  closePlugin: jest.fn(),
  currentPage: {
    selection: [] as any[],
    findAll: jest.fn().mockReturnValue([]),
  },
  getNodeById: jest.fn().mockReturnValue(null),
  loadFontAsync: jest.fn().mockResolvedValue(undefined),
  mixed: Symbol('mixed'),
  clientStorage: {
    getAsync: jest.fn().mockImplementation((key: string) => {
      return Promise.resolve(mockStorage[key]);
    }),
    setAsync: jest.fn().mockImplementation((key: string, value: any) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
  },
  ui: {
    postMessage: jest.fn().mockImplementation((msg: any) => {
      mockCallbacks.postedMessages.push(msg);
    }),
    onmessage: null as ((msg: any) => void) | null,
  },
  on: jest.fn().mockImplementation((event: string, callback: () => void) => {
    if (event === 'selectionchange') {
      mockCallbacks.onSelectionChange = callback;
    }
  }),
};

// Set up global figma object
(global as any).figma = figmaMock;

// Set up HTML placeholder for showUI
(global as any).__html__ = '<html></html>';

// Mock fetch with configurable responses
export const mockFetchResponses: Array<{
  url?: string | RegExp;
  response: {
    ok: boolean;
    status: number;
    json: () => Promise<any>;
    text: () => Promise<string>;
  };
}> = [];

const mockFetch = jest.fn().mockImplementation((url: string, _options?: any) => {
  // Find matching mock response
  const matchingMock = mockFetchResponses.find(mock => {
    if (!mock.url) return true;
    if (typeof mock.url === 'string') return url.includes(mock.url);
    return mock.url.test(url);
  });

  if (matchingMock) {
    return Promise.resolve(matchingMock.response);
  }

  // Default: return 404
  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' }),
    text: () => Promise.resolve('Not found'),
  });
});

(global as any).fetch = mockFetch;

// Helper to reset mocks between tests
export function resetMocks() {
  mockCallbacks.postedMessages = [];
  mockCallbacks.onMessage = null;
  mockCallbacks.onSelectionChange = null;
  mockFetchResponses.length = 0;

  // Clear mock storage
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);

  // Reset all jest mocks
  jest.clearAllMocks();

  // Reset figma mocks to defaults
  figmaMock.currentPage.selection = [];
  figmaMock.currentPage.findAll.mockReturnValue([]);
  figmaMock.getNodeById.mockReturnValue(null);
}

// Helper to set mock storage
export function setMockStorage(key: string, value: any) {
  mockStorage[key] = value;
}

// Helper to get posted messages of a specific type
export function getPostedMessages(type?: string): any[] {
  if (!type) return mockCallbacks.postedMessages;
  return mockCallbacks.postedMessages.filter(msg => msg.type === type);
}

// Helper to get the last posted message
export function getLastPostedMessage(): any {
  return mockCallbacks.postedMessages[mockCallbacks.postedMessages.length - 1];
}

// Helper to set up a mock fetch response
export function mockFetchResponse(urlPattern: string | RegExp | undefined, response: {
  ok?: boolean;
  status?: number;
  data?: any;
  text?: string;
}) {
  mockFetchResponses.push({
    url: urlPattern,
    response: {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: () => Promise.resolve(response.data ?? {}),
      text: () => Promise.resolve(response.text ?? JSON.stringify(response.data ?? {})),
    },
  });
}

// Export figma mock for direct manipulation in tests
export { figmaMock, mockFetch, mockStorage };
