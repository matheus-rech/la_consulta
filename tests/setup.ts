import '@testing-library/jest-dom';

global.window = global.window || {};
global.document = global.document || {};

global.window.pdfjsLib = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(),
};

// Create proper jest mock functions for localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

global.localStorage = localStorageMock as any;
