import { Fragment } from 'react'
import { Popover, Transition } from '@headlessui/react'
import {
  Menu,
  Settings,
  HelpCircle,
  List,
  Play,
  LayoutGrid,
} from 'lucide-react'

const sectionConfig = [
  {
    title: 'View',
    items: [
      { label: 'Linear View', icon: List, action: 'onLinearView' },
      { label: 'Playthrough', icon: Play, action: 'onPlaythrough' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Auto-layout', icon: LayoutGrid, action: 'onAutoLayout' },
      { label: 'Settings', icon: Settings, action: 'onShowSettings' },
    ],
  },
  {
    title: 'Help',
    items: [{ label: 'Help', icon: HelpCircle, action: 'onHelp' }],
  },
]

export default function FloatingMenu({
  onShowSettings,
  // onShowAiSettings,
  onLinearView,
  onPlaythrough,
  onAutoLayout,
  onHelp,
}) {
  const propMap = {
    onShowSettings,
    onLinearView,
    onPlaythrough,
    onAutoLayout,
    onHelp,
  }

  const sections = sectionConfig
    .map((section) => ({
      title: section.title,
      items: section.items
        .map((item) => {
          const onClick = propMap[item.action]
          return onClick && { ...item, onClick }
        })
        .filter(Boolean),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <Popover className="fixed bottom-4 right-4 z-50">
      {({ open }) => (
        <>
          <Popover.Button
            className="rounded-full bg-[var(--btn)] p-3 text-[var(--text)] shadow-lg hover:bg-[var(--btn-hover)] focus:outline-none"
            title="Menu"
          >
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
            <Popover.Panel className="mt-2 rounded-lg bg-[var(--panel)] p-2 text-sm text-[var(--text)] shadow-lg">
              {sections.map((section, idx) => (
                <div key={section.title} className="flex flex-col gap-1">
                  {idx > 0 && <div className="my-1 border-t border-[var(--line)]" />}
                  <div className="px-3 py-1 text-xs font-semibold opacity-60">
                    {section.title}
                  </div>
                  {section.items.map(({ label, icon, onClick }) => {
                    const Icon = icon
                    return (
                      <button
                        key={label}
                        className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                        onClick={onClick}
                        title={label}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
