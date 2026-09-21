// Pure: should a project appear in the workshop story list?
// True if this browser created it (local id) or it is a cloud-synced story that
// is NOT explicitly an advanced-app project. Erring toward showing means a real
// workshop story is never accidentally hidden across devices; only projects
// tagged app === 'advanced' are kept out.
export function showInWorkshopList(id, project, localIds) {
  if (localIds.includes(id)) return true
  return !!project?.cloud && project?.app !== 'advanced'
}
