import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './tokens/tokens.css'
import './tokens/typography.css'
import './index.css'
import './omni/index.css'
import App from './App'
import { Agentation } from 'agentation'
import { CurrentUserProvider } from './omni/CurrentUser.jsx'
import { ConversationFieldsProvider } from './omni/ConversationFields.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConversationFieldsProvider>
        <CurrentUserProvider>
          <App />
          {import.meta.env.DEV && <Agentation />}
        </CurrentUserProvider>
      </ConversationFieldsProvider>
    </BrowserRouter>
  </StrictMode>,
)
