export function getDeviceId() {
  let id = localStorage.getItem("sara_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sara_device_id", id);
  }
  return id;
}
