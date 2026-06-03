import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

it("renders the home page", () => {
  render(<Page />);
  expect(screen.getByAltText(/logo/i)).toBeTruthy();
});
