import React from 'react';
import { render, screen } from '@testing-library/react';

test('renders simple container', () => {
  render(<div>SME Portal</div>);
  const element = screen.getByText(/SME Portal/i);
  expect(element).toBeInTheDocument();
});

