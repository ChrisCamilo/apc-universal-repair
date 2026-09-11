describe("Health check", () => {
  it("shows the API status on the home page", () => {
    cy.visit("/");
    cy.get('[data-testid="health-status"]').should("contain.text", "API status:");
  });
});
