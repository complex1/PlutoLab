import { Link } from "react-router-dom";
import "./BackButton.css";

export default function BackButton() {
  return (
    <Link to="/" className="back-btn">
      <span className="back-arrow">←</span>
      <span>Catalog</span>
    </Link>
  );
}
