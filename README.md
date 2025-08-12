# Open Finance Calculators

A comprehensive suite of free, professional-grade financial calculators with educational content. All calculations run in your browser for complete privacy - we never see your financial data.

## 🚀 Features

- **Privacy First**: All calculations run locally in your browser
- **Professional Quality**: Built with industry-standard financial formulas
- **Educational Content**: Learn the math behind each calculation
- **Mobile Optimized**: Responsive design that works on all devices
- **Offline Capable**: Use calculators offline after the first visit
- **No Signup Required**: Completely free with no accounts needed

## 📊 Available Calculators

### Investment & Growth
- **Compound Interest Calculator** - See how your money grows over time
- **Savings Rate Calculator** - Calculate your path to financial independence
- **Goal Timeline Calculator** - Plan for major financial goals

### Debt Management
- **Debt Payoff Calculator** - Choose between snowball and avalanche methods
- **Extra Payment Calculator** - See the impact of additional payments
- **Credit Card Minimum Calculator** - Understand minimum payment implications
- **Debt-to-Income Calculator** - Assess your borrowing capacity

### Financial Planning
- **Emergency Fund Calculator** - Build your financial safety net
- **Refinance Calculator** - Evaluate loan refinancing options
- **Budget Splitter** - Manage shared expenses and split bills fairly

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js with data labels
- **Styling**: Custom CSS with responsive design
- **Build**: No build process required - pure vanilla web technologies
- **Hosting**: Netlify with form handling

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/pixelwavemarketing/finance-toolkit.git
   cd finance-toolkit
   ```

2. Open `index.html` in your web browser

3. No build process or dependencies to install!

## 📁 Project Structure

```
finance-toolkit/
├── index.html                 # Home page
├── calculators.html           # Calculator directory
├── about.html                # About page
├── contact.html              # Contact page
├── privacy-policy.html       # Privacy policy
├── terms.html                # Terms of service
├── css/
│   └── styles.css           # Main stylesheet
├── js/
│   ├── app.js               # Main application logic
│   ├── engines.js           # Calculation engines
│   ├── ui.js                # UI rendering functions
│   └── utils.js             # Utility functions
├── config/
│   └── calculators.json     # Calculator configurations
└── calculators/
    ├── compound-interest/    # Individual calculator pages
    ├── debt-payoff/
    ├── emergency-fund/
    └── ... (other calculators)
```

## 🔧 Development

### Adding a New Calculator

1. Create a new folder in `calculators/`
2. Add `index.html` with the calculator page
3. Add `calculator.json` with the calculator configuration
4. Update `config/calculators.json` to include the new calculator
5. Add calculation logic to `js/engines.js`

### Calculator Configuration Format

```json
{
  "id": "calculator-name",
  "title": "Calculator Title",
  "description": "Brief description",
  "inputs": [
    {
      "name": "inputName",
      "label": "Input Label",
      "type": "currency|percent|number|select",
      "min": 0,
      "max": 100,
      "step": 1,
      "default": 50
    }
  ],
  "compute": "computeFunctionName",
  "outputs": [
    {
      "name": "outputName",
      "label": "Output Label",
      "format": "currency|percent|number"
    }
  ]
}
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

- **Website**: [openfinancecalculators.com](https://openfinancecalculators.com)
- **Contact**: [Contact Form](https://openfinancecalculators.com/contact.html)
- **Built by**: [pixelwave marketing](https://usepixelwave.com)

## 🙏 Acknowledgments

- Financial formulas based on industry standards
- Chart.js for data visualization
- Community contributors and feedback

---

**Note**: This tool is for educational purposes only. Always consult with qualified financial professionals before making financial decisions.
