import { Fragment } from 'react'
import { Popover, Transition } from '@headlessui/react'
import {
  Menu,
  Upload,
  Download,
  Settings,
  HelpCircle,
  FileText,
  FilePlus,
  List,
  Play,
  LayoutGrid,
} from 'lucide-react'

export default function FloatingMenu({
  onExport,
  onImport,
  onShowSettings,
  onShowAiSettings,
  onExportMd,
  onLinearView,
  onPlaythrough,
  onAutoLayout,
  onHelp,
  onNewProject,
}) {
  return (
    <Popover className="fixed bottom-4 right-4 z-50">
      {({ open }) => (
        <>
          <Popover.Button className="rounded-full bg-[var(--btn)] p-3 text-[var(--text)] shadow-lg hover:bg-[var(--btn-hover)] focus:outline-none">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Popover.Button>
          <Transition
            as={Fragment}
            show={open}
            enter="transition transform duration-200 ease-out"
            enterFrom="opacity-0 translate-y-2"
            enterTo="opacity-100 translate-y-0"
            leave="transition transform duration-150 ease-in"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-2"
          >
            <Popover.Panel className="mt-2 flex flex-col gap-1 rounded-lg bg-[var(--panel)] p-2 text-sm text-[var(--text)] shadow-lg">
              <button
                className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                onClick={onExport}
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" />Export</span>
              </button>
              {onExportMd && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onExportMd}
                >
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" />Export MD</span>
                </button>
              )}
              {onLinearView && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onLinearView}
                >
                  <span className="flex items-center gap-2"><List className="h-4 w-4" />Linear View</span>
                </button>
              )}
              {onPlaythrough && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onPlaythrough}
                >
                  <span className="flex items-center gap-2"><Play className="h-4 w-4" />Playthrough</span>
                </button>
              )}
              {onAutoLayout && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onAutoLayout}
                >
                  <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" />Auto-layout</span>
                </button>
              )}
              {onNewProject && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onNewProject}
                >
                  <span className="flex items-center gap-2"><FilePlus className="h-4 w-4" />New project</span>
                </button>
              )}
              <button
                className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                onClick={onImport}
              >
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" />Import</span>
              </button>
              <button
                className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                onClick={onShowSettings}
              >
                <span className="flex items-center gap-2"><Settings className="h-4 w-4" />Settings</span>
              </button>
              <button
                className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                onClick={onShowAiSettings}
              >
                <span className="flex items-center gap-2"><Settings className="h-4 w-4" />AI Settings</span>
              </button>
              {onHelp && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onHelp}
                >
                  <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" />Help</span>
                </button>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
