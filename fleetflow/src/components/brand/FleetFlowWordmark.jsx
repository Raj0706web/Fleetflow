export default function FleetFlowWordmark({
  inverse = false,
  className = "text-base",
}) {
  return (
    <img
      src={
        inverse
          ? "/brand/fleetflow-wordmark-inverse.png"
          : "/brand/fleetflow-wordmark.png"
      }
      alt="FleetFlow"
      className={`inline-block h-[1em] w-auto ${className}`}
      draggable="false"
    />
  );
}
