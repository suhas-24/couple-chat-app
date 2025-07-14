import React from 'react';

export const useChat = jest.fn(() => ({
  currentChat: null,
  setCurrentChat: jest.fn(),
  messages: [],
  setMessages: jest.fn(),
  loading: false,
  sendMessage: jest.fn(),
  loadMessages: jest.fn()
}));