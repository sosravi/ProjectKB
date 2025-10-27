// E2E Tests - Cypress
describe('ProjectKB End-to-End Tests', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
  });

  describe('Authentication Flow', () => {
    it('should complete user registration and login', () => {
      // Click sign up link
      cy.contains('Sign up').click();
      
      // Fill registration form
      cy.get('[data-testid="username-input"]').type('testuser123');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('Password123!');
      cy.get('[data-testid="confirm-password-input"]').type('Password123!');
      cy.get('[data-testid="first-name-input"]').type('Test');
      cy.get('[data-testid="last-name-input"]').type('User');
      
      // Submit registration
      cy.get('[data-testid="signup-button"]').click();
      
      // Should show confirmation message
      cy.contains('Please check your email for verification').should('be.visible');
      
      // Mock email verification (in real app, user would click email link)
      cy.visit('/login');
      
      // Login with new credentials
      cy.get('[data-testid="username-input"]').type('testuser123');
      cy.get('[data-testid="password-input"]').type('Password123!');
      cy.get('[data-testid="signin-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Project Knowledge Bases').should('be.visible');
    });

    it('should handle login with Google OAuth', () => {
      // Mock Google OAuth
      cy.window().then((win) => {
        win.google = {
          accounts: {
            oauth2: {
              initTokenClient: cy.stub().returns({
                requestAccessToken: cy.stub().callsFake((callback) => {
                  callback({ access_token: 'mock-google-token' });
                })
              })
            }
          }
        };
      });

      // Click Google login button
      cy.get('[data-testid="google-login-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
    });

    it('should handle login with Microsoft OAuth', () => {
      // Mock Microsoft OAuth
      cy.window().then((win) => {
        win.msal = {
          PublicClientApplication: cy.stub().returns({
            loginPopup: cy.stub().resolves({
              accessToken: 'mock-microsoft-token'
            })
          })
        };
      });

      // Click Microsoft login button
      cy.get('[data-testid="microsoft-login-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
    });

    it('should show error for invalid credentials', () => {
      cy.get('[data-testid="username-input"]').type('invaliduser');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="signin-button"]').click();
      
      // Should show error message
      cy.contains('Invalid username or password').should('be.visible');
    });
  });

  describe('PKB Management', () => {
    beforeEach(() => {
      // Login first
      cy.login('testuser', 'Password123!');
    });

    it('should create a new PKB', () => {
      // Click create PKB button
      cy.get('[data-testid="create-pkb-button"]').click();
      
      // Fill PKB form
      cy.get('[data-testid="pkb-name-input"]').type('My Test PKB');
      cy.get('[data-testid="pkb-description-input"]').type('This is a test project knowledge base');
      
      // Submit form
      cy.get('[data-testid="create-pkb-submit"]').click();
      
      // Should show success message
      cy.contains('PKB created successfully').should('be.visible');
      
      // Should appear in PKB list
      cy.contains('My Test PKB').should('be.visible');
    });

    it('should edit an existing PKB', () => {
      // Create a PKB first
      cy.createPKB('Test PKB', 'Original description');
      
      // Click edit button
      cy.get('[data-testid="edit-pkb-button"]').first().click();
      
      // Update PKB details
      cy.get('[data-testid="pkb-name-input"]').clear().type('Updated PKB Name');
      cy.get('[data-testid="pkb-description-input"]').clear().type('Updated description');
      
      // Submit changes
      cy.get('[data-testid="update-pkb-submit"]').click();
      
      // Should show success message
      cy.contains('PKB updated successfully').should('be.visible');
      
      // Should show updated name
      cy.contains('Updated PKB Name').should('be.visible');
    });

    it('should delete a PKB with confirmation', () => {
      // Create a PKB first
      cy.createPKB('Delete Test PKB', 'This will be deleted');
      
      // Click delete button
      cy.get('[data-testid="delete-pkb-button"]').first().click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Should show success message
      cy.contains('PKB deleted successfully').should('be.visible');
      
      // Should not appear in list
      cy.contains('Delete Test PKB').should('not.exist');
    });

    it('should search and filter PKBs', () => {
      // Create multiple PKBs
      cy.createPKB('React Project', 'A React-based project');
      cy.createPKB('Vue Project', 'A Vue.js project');
      cy.createPKB('Angular Project', 'An Angular project');
      
      // Search for React PKB
      cy.get('[data-testid="pkb-search-input"]').type('React');
      
      // Should only show React PKB
      cy.contains('React Project').should('be.visible');
      cy.contains('Vue Project').should('not.exist');
      cy.contains('Angular Project').should('not.exist');
      
      // Clear search
      cy.get('[data-testid="pkb-search-input"]').clear();
      
      // Should show all PKBs again
      cy.contains('React Project').should('be.visible');
      cy.contains('Vue Project').should('be.visible');
      cy.contains('Angular Project').should('be.visible');
    });
  });

  describe('Content Management', () => {
    beforeEach(() => {
      // Login and create PKB
      cy.login('testuser', 'Password123!');
      cy.createPKB('Content Test PKB', 'For testing content uploads');
    });

    it('should upload a text file', () => {
      // Navigate to PKB
      cy.contains('Content Test PKB').click();
      
      // Click upload button
      cy.get('[data-testid="upload-button"]').click();
      
      // Select file
      cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.txt');
      
      // Should show upload progress
      cy.contains('Uploading...').should('be.visible');
      
      // Should show success message
      cy.contains('File uploaded successfully').should('be.visible');
      
      // Should appear in content list
      cy.contains('sample.txt').should('be.visible');
    });

    it('should upload an image file', () => {
      // Navigate to PKB
      cy.contains('Content Test PKB').click();
      
      // Click upload button
      cy.get('[data-testid="upload-button"]').click();
      
      // Select image file
      cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.jpg');
      
      // Should show upload progress
      cy.contains('Uploading...').should('be.visible');
      
      // Should show success message
      cy.contains('File uploaded successfully').should('be.visible');
      
      // Should show image preview
      cy.get('[data-testid="image-preview"]').should('be.visible');
    });

    it('should handle drag and drop upload', () => {
      // Navigate to PKB
      cy.contains('Content Test PKB').click();
      
      // Drag and drop file
      cy.get('[data-testid="drop-zone"]').selectFile('cypress/fixtures/sample.txt', {
        action: 'drag-drop'
      });
      
      // Should show upload progress
      cy.contains('Uploading...').should('be.visible');
      
      // Should show success message
      cy.contains('File uploaded successfully').should('be.visible');
    });

    it('should delete uploaded content', () => {
      // Upload a file first
      cy.contains('Content Test PKB').click();
      cy.get('[data-testid="upload-button"]').click();
      cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.txt');
      cy.contains('File uploaded successfully').should('be.visible');
      
      // Click delete button
      cy.get('[data-testid="delete-content-button"]').first().click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Should show success message
      cy.contains('Content deleted successfully').should('be.visible');
      
      // Should not appear in list
      cy.contains('sample.txt').should('not.exist');
    });
  });

  describe('AI Integration', () => {
    beforeEach(() => {
      // Login and create PKB with content
      cy.login('testuser', 'Password123!');
      cy.createPKB('AI Test PKB', 'For testing AI features');
      cy.contains('AI Test PKB').click();
      
      // Upload some content
      cy.get('[data-testid="upload-button"]').click();
      cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.txt');
      cy.contains('File uploaded successfully').should('be.visible');
    });

    it('should process text query', () => {
      // Click AI chat button
      cy.get('[data-testid="ai-chat-button"]').click();
      
      // Type query
      cy.get('[data-testid="ai-query-input"]').type('What is this document about?');
      
      // Submit query
      cy.get('[data-testid="submit-query-button"]').click();
      
      // Should show AI response
      cy.contains('AI Response').should('be.visible');
      cy.get('[data-testid="ai-response"]').should('not.be.empty');
    });

    it('should process image query', () => {
      // Upload an image
      cy.get('[data-testid="upload-button"]').click();
      cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.jpg');
      cy.contains('File uploaded successfully').should('be.visible');
      
      // Click AI chat button
      cy.get('[data-testid="ai-chat-button"]').click();
      
      // Type image query
      cy.get('[data-testid="ai-query-input"]').type('Describe this image');
      
      // Submit query
      cy.get('[data-testid="submit-query-button"]').click();
      
      // Should show AI response
      cy.contains('AI Response').should('be.visible');
      cy.get('[data-testid="ai-response"]').should('not.be.empty');
    });

    it('should show AI suggestions', () => {
      // Click AI suggestions button
      cy.get('[data-testid="ai-suggestions-button"]').click();
      
      // Should show suggestions panel
      cy.contains('AI Suggestions').should('be.visible');
      cy.get('[data-testid="suggestion-item"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Version Display', () => {
    it('should show version tooltip on hover', () => {
      // Login first
      cy.login('testuser', 'Password123!');
      
      // Hover over version element
      cy.get('[data-testid="version-tooltip"]').trigger('mouseover');
      
      // Should show version tooltip
      cy.contains('v1.0.0').should('be.visible');
      
      // Move mouse away
      cy.get('[data-testid="version-tooltip"]').trigger('mouseout');
      
      // Tooltip should hide
      cy.contains('v1.0.0').should('not.be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      // Set mobile viewport
      cy.viewport('iphone-x');
      
      // Login
      cy.login('testuser', 'Password123!');
      
      // Should show mobile navigation
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      
      // Click mobile menu
      cy.get('[data-testid="mobile-menu-button"]').click();
      
      // Should show navigation items
      cy.contains('Dashboard').should('be.visible');
      cy.contains('Settings').should('be.visible');
    });

    it('should work on tablet devices', () => {
      // Set tablet viewport
      cy.viewport('ipad-2');
      
      // Login
      cy.login('testuser', 'Password123!');
      
      // Should show tablet layout
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('[data-testid="main-content"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      // Login
      cy.login('testuser', 'Password123!');
      
      // Tab through navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'create-pkb-button');
      
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'search-input');
    });

    it('should have proper ARIA labels', () => {
      // Login
      cy.login('testuser', 'Password123!');
      
      // Check ARIA labels
      cy.get('[data-testid="create-pkb-button"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="search-input"]').should('have.attr', 'aria-label');
    });

    it('should announce dynamic content changes', () => {
      // Login
      cy.login('testuser', 'Password123!');
      
      // Create PKB
      cy.get('[data-testid="create-pkb-button"]').click();
      cy.get('[data-testid="pkb-name-input"]').type('Accessibility Test PKB');
      cy.get('[data-testid="create-pkb-submit"]').click();
      
      // Should announce success
      cy.get('[role="alert"]').should('contain', 'PKB created successfully');
    });
  });
});

// Custom Commands
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="signin-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('createPKB', (name, description) => {
  cy.get('[data-testid="create-pkb-button"]').click();
  cy.get('[data-testid="pkb-name-input"]').type(name);
  cy.get('[data-testid="pkb-description-input"]').type(description);
  cy.get('[data-testid="create-pkb-submit"]').click();
  cy.contains('PKB created successfully').should('be.visible');
});

