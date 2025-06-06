import { Fragment } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { Menu, Upload, Download, Settings, HelpCircle } from 'lucide-react'

export default function FloatingMenu({
  onExport,
  onImport,
  onShowSettings,
  onShowAiSettings,
  onHelp,
}) {
  return (
    <Popover className="fixed bottom-4 right-4 z-50">
      {() => (
        <>
          <Popover.Button className="rounded-full bg-[var(--btn)] p-3 text-[var(--text)] shadow-lg hover:bg-[var(--btn-hover)] focus:outline-none">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition duration-150 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition duration-100 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Popover.Panel className="mt-2 flex flex-col gap-1 rounded-lg bg-[var(--panel)] p-2 text-sm text-[var(--text)] shadow-lg">
              <button
                className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                onClick={onExport}
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" />Export</span>
              </button>
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
                <span className="flex items-center gap-2"><Settings className="h-4 w-4" />Inställningar</span>
              </button>
              <button
                className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                onClick={onShowAiSettings}
              >
                <span className="flex items-center gap-2"><Settings className="h-4 w-4" />AI-inställningar</span>
              </button>
              {onHelp && (
                <button
                  className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                  onClick={onHelp}
                >
                  <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" />Hjälp</span>
                </button>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
