import { createFigma } from 'figma-api-stub';

// Setup global figma mock before each test
beforeEach(() => {
  const figmaMock = createFigma({
    simulateErrors: true,
  });

  // Mock clientStorage methods
  const clientStorageMock = {
    getAsync: jest.fn().mockResolvedValue(null),
    setAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockResolvedValue(undefined),
    keysAsync: jest.fn().mockResolvedValue([]),
  };

  // Use Object.defineProperty to override read-only property
  Object.defineProperty(figmaMock, 'clientStorage', {
    value: clientStorageMock,
    writable: true,
    configurable: true,
  });

  // Mock currentPage with findAllWithCriteria and findAll
  const currentPageMock = {
    findAllWithCriteria: jest.fn().mockReturnValue([]),
    findAll: jest.fn().mockReturnValue([]),
    selection: [] as unknown[],
  };

  Object.defineProperty(figmaMock, 'currentPage', {
    value: currentPageMock,
    writable: true,
    configurable: true,
  });

  // Mock getNodeByIdAsync
  Object.defineProperty(figmaMock, 'getNodeByIdAsync', {
    value: jest.fn().mockResolvedValue(null),
    writable: true,
    configurable: true,
  });

  // Mock loadFontAsync
  Object.defineProperty(figmaMock, 'loadFontAsync', {
    value: jest.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });

  // Mock viewport
  const viewportMock = {
    scrollAndZoomIntoView: jest.fn(),
  };

  Object.defineProperty(figmaMock, 'viewport', {
    value: viewportMock,
    writable: true,
    configurable: true,
  });

  // Mock mixed symbol
  Object.defineProperty(figmaMock, 'mixed', {
    value: Symbol('mixed'),
    writable: true,
    configurable: true,
  });

  // @ts-expect-error - figma is a global in Figma plugins
  global.figma = figmaMock;

  // Mock fetch globally
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});
