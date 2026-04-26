import { useLocation, useNavigate } from 'react-router-dom'
import { navigateBackWithLog } from '../../utils/navigation'

type BackButtonProps = {
  fallbackPath?: string
  className?: string
  onClick?: () => void
}

export function BackButton({ fallbackPath = '/home', className, onClick }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }

    navigateBackWithLog(navigate, location.pathname, fallbackPath)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors ${className ?? ''}`}
    >
      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
      Back
    </button>
  )
}
