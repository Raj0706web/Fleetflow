export default function FleetFlowMark({ inverse = false, className = "h-8 w-8" }) {
  return (
    <img
      src={inverse ? "/brand/fleetflow-mark-inverse.png" : "/brand/fleetflow-mark.png"}
      alt=""
      className={`object-contain ${className}`}
      aria-hidden="true"
      draggable="false"
    />
  );
}
