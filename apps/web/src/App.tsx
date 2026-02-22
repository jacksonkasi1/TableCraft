import { Presentation } from './Presentation'
import { CoverSlide } from './slides/CoverSlide'
import { IntroSlide } from './slides/IntroSlide'
import { FeaturesSlide } from './slides/FeaturesSlide'
import { QuoteSlide } from './slides/QuoteSlide'
import { OutroSlide } from './slides/OutroSlide'
import './index.css'

function App() {
  return (
    <Presentation
      slides={[
        <CoverSlide key="cover" />,
        <IntroSlide key="intro" />,
        <FeaturesSlide key="features" />,
        <QuoteSlide key="quote" />,
        <OutroSlide key="outro" />
      ]}
    />
  )
}

export default App