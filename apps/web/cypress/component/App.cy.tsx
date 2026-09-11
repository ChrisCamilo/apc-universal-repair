import App from "../../src/App";

describe("<App />", () => {
  it("renders the project title", () => {
    cy.mount(<App />);
    cy.contains("APC Universal Repair");
  });
});
