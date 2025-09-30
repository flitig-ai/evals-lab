import { useState, useEffect } from 'react'
import './App.css'
import { callAIModel } from './api'

function App() {
  const [prompt, setPrompt] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  const [constraints, setConstraints] = useState('')
  const [model, setModel] = useState('claude-sonnet-4.5')
  const [responses, setResponses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedTests, setSavedTests] = useState([])
  const [showTestLibrary, setShowTestLibrary] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedModels, setSelectedModels] = useState([])
  const [showPromptConfig, setShowPromptConfig] = useState(false)
  const [evaluationPrompts, setEvaluationPrompts] = useState({
    matchesExpected: `RESPONSE TEXT TO EVALUATE:
"{response}"

EXPECTED OUTPUT CRITERIA:
"{expectedOutput}"

Question: Does the RESPONSE TEXT match the EXPECTED OUTPUT CRITERIA?

Be strict and literal. Focus ONLY on the response text itself, not the criteria wording.`,
    
    constraints: `RESPONSE TEXT TO CHECK:
"{response}"

CONSTRAINTS (what should NOT be in the response):
{constraints}

Question: Does the RESPONSE TEXT violate any constraints?

Examine ONLY the response text, not the constraint wording itself. Report violations clearly.`
  })

  const allModels = [
    { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', group: 'Anthropic' },
    { id: 'claude-4-opus', name: 'Claude 4 Opus', group: 'Anthropic' },
    { id: 'gpt-4.1', name: 'GPT-4.1', group: 'OpenAI' },
    { id: 'gpt-4o', name: 'GPT-4o', group: 'OpenAI' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', group: 'OpenAI' },
  ]

  useEffect(() => {
    // Load saved test cases
    const saved = localStorage.getItem('evalTests')
    if (saved) {
      setSavedTests(JSON.parse(saved))
    }
  }, [])

  const toggleModelSelection = (modelId) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(m => m !== modelId)
        : [...prev, modelId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setError('')
    
    // Clear previous results before running new evaluation
    setResponses([])
    
    try {
      const modelsToTest = compareMode ? selectedModels : [model]
      
      if (compareMode && modelsToTest.length === 0) {
        setError('Please select at least one model to compare')
        setIsLoading(false)
        return
      }

      const results = []
      
      for (const testModel of modelsToTest) {
        const result = await callAIModel(prompt, testModel)
        const structuralChecks = await runStructuralChecksWithConstraints(result.response, expectedOutput, prompt, constraints)
        
        const newResponse = {
          id: Date.now() + Math.random(),
          prompt: prompt,
          expectedOutput: expectedOutput,
          constraints: constraints,
          model: testModel,
          response: result.response,
          timestamp: new Date().toLocaleString(),
          rating: null,
          structuralChecks: structuralChecks,
          metrics: {
            responseTime: result.responseTime,
            tokenCount: result.tokenCount,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens
          }
        }
        
        results.push(newResponse)
      }
      
      setResponses(results)
      if (!compareMode) {
        setPrompt('')
        setExpectedOutput('')
        setConstraints('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = () => {
    setResponses([])
  }

  const rateResponse = (id, stars, comment = '') => {
    setResponses(responses.map(r => 
      r.id === id ? (stars === null ? { ...r, rating: null } : { ...r, rating: { stars, comment, timestamp: new Date().toLocaleString() } }) : r
    ))
  }

  // AI-based constraint checking (moved to automated checks)
  const checkConstraintsWithAI = async (response, constraints) => {
    if (!constraints) return null
    
    const prompt = evaluationPrompts.constraints
      .replace('{response}', response)
      .replace('{constraints}', constraints)
    
    const constraintEval = await runAIEvaluation(response, prompt)
    
    return {
      name: 'Constraints',
      passed: constraintEval.passed,
      details: constraintEval.details,
      type: 'ai-judge'
    }
  }

  const runAIEvaluation = async (response, criteria) => {
    try {
      const evalResponse = await fetch('http://localhost:3001/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response, criteria })
      })
      
      if (!evalResponse.ok) {
        return { passed: false, details: 'AI evaluation failed' }
      }
      
      return await evalResponse.json()
    } catch (error) {
      return { passed: false, details: 'AI evaluation error' }
    }
  }

  const runStructuralChecks = async (response, expectedOutput, prompt) => {
    const checks = []
    
    if (!expectedOutput) return checks
    
    const expectedLower = expectedOutput.toLowerCase()
    
    // AI-based semantic match - does it match expected output?
    const matchPrompt = evaluationPrompts.matchesExpected
      .replace('{response}', response)
      .replace('{expectedOutput}', expectedOutput)
    
    const semanticEval = await runAIEvaluation(response, matchPrompt)
    checks.push({
      name: 'Matches Expected Output',
      passed: semanticEval.passed,
      details: semanticEval.details,
      type: 'ai-judge'
    })
    
    
    // Check word count
    const wordCountMatch = expectedLower.match(/(\d+)\s*words?/)
    if (wordCountMatch) {
      const expectedWords = parseInt(wordCountMatch[1])
      const actualWords = response.split(/\s+/).length
      const withinRange = Math.abs(actualWords - expectedWords) <= 3
      checks.push({
        name: `Word Count (~${expectedWords} words)`,
        passed: withinRange,
        details: `${actualWords} words`,
        type: 'rule-based'
      })
    }
    
    // Check if it's JSON
    if (expectedLower.includes('json')) {
      try {
        JSON.parse(response)
        checks.push({
          name: 'Valid JSON',
          passed: true,
          details: 'Valid JSON format',
          type: 'rule-based'
        })
      } catch {
        checks.push({
          name: 'Valid JSON',
          passed: false,
          details: 'Invalid JSON format',
          type: 'rule-based'
        })
      }
    }
    
    return checks
  }
  
  const runStructuralChecksWithConstraints = async (response, expectedOutput, prompt, constraints) => {
    const checks = await runStructuralChecks(response, expectedOutput, prompt)
    
    // Add AI-based constraint check if constraints are provided
    if (constraints) {
      const constraintCheck = await checkConstraintsWithAI(response, constraints)
      if (constraintCheck) {
        checks.push(constraintCheck)
      }
    }
    
    return checks
  }

  const saveAsTestCase = (response) => {
    const testCase = {
      id: Date.now(),
      prompt: response.prompt,
      expectedOutput: response.expectedOutput || response.response,
      constraints: response.constraints,
      model: response.model,
      models: compareMode ? selectedModels : [response.model]
    }
    const updated = [...savedTests, testCase]
    setSavedTests(updated)
    localStorage.setItem('evalTests', JSON.stringify(updated))
    alert('Test case saved!')
  }

  const loadTest = (test) => {
    setPrompt(test.prompt)
    setExpectedOutput(test.expectedOutput || '')
    setConstraints(test.constraints || '')
    
    // Load saved models if available
    if (test.models && test.models.length > 1) {
      setCompareMode(true)
      setSelectedModels(test.models)
    } else {
      setCompareMode(false)
      setModel(test.model)
    }
    
    setShowTestLibrary(false)
  }

  const deleteTest = (testId) => {
    const updated = savedTests.filter(t => t.id !== testId)
    setSavedTests(updated)
    localStorage.setItem('evalTests', JSON.stringify(updated))
  }

  const runTestSuite = async () => {
    if (savedTests.length === 0) {
      alert('No test cases saved yet!')
      return
    }
    
    setShowTestLibrary(false)
    
    for (const test of savedTests) {
      setPrompt(test.prompt)
      setExpectedOutput(test.expectedOutput || '')
      setConstraints(test.constraints || '')
      setModel(test.model)
      
      // Wait and auto-submit
      await new Promise(resolve => setTimeout(resolve, 500))
      document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧪 AI Evals Lab</h1>
        <p className="subtitle">Test, evaluate, and compare AI model responses</p>
      </header>

      {showPromptConfig && (
        <div className="test-library-modal">
          <div className="test-library-content" style={{maxWidth: '900px'}}>
            <div className="test-library-header">
              <h2>⚙️ Configure AI Judge Prompts</h2>
              <button onClick={() => setShowPromptConfig(false)} className="close-btn">✕</button>
            </div>
            <div style={{padding: '1.5rem'}}>
              <p style={{marginBottom: '1rem', color: '#666'}}>
                Customize how the AI evaluates responses. Use <code>{'{'}response{'}'}</code>, <code>{'{'}expectedOutput{'}'}</code>, <code>{'{'}constraints{'}'}</code> as placeholders.
              </p>
              
              <div className="prompt-config-section">
                <label><strong>Matches Expected Output:</strong></label>
                <p style={{fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem'}}>
                  This evaluates if the response meets the expected output criteria. Works for any type of output.
                </p>
                <textarea
                  value={evaluationPrompts.matchesExpected}
                  onChange={(e) => setEvaluationPrompts({...evaluationPrompts, matchesExpected: e.target.value})}
                  rows="8"
                  className="prompt-input"
                  style={{fontFamily: 'monospace', fontSize: '0.9rem'}}
                />
              </div>

              <div className="prompt-config-section">
                <label><strong>Constraints Check:</strong></label>
                <p style={{fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem'}}>
                  This checks if the response violates any constraints (what should NOT be in the response).
                </p>
                <textarea
                  value={evaluationPrompts.constraints}
                  onChange={(e) => setEvaluationPrompts({...evaluationPrompts, constraints: e.target.value})}
                  rows="8"
                  className="prompt-input"
                  style={{fontFamily: 'monospace', fontSize: '0.9rem'}}
                />
              </div>

              <div style={{marginTop: '1.5rem', display: 'flex', gap: '1rem'}}>
                <button onClick={() => setShowPromptConfig(false)} className="load-test-btn">
                  ✅ Save & Close
                </button>
                <button 
                  onClick={() => {
                    setEvaluationPrompts({
                      matchesExpected: `RESPONSE TEXT TO EVALUATE:
"{response}"

EXPECTED OUTPUT CRITERIA:
"{expectedOutput}"

Question: Does the RESPONSE TEXT match the EXPECTED OUTPUT CRITERIA?

Be strict and literal. Focus ONLY on the response text itself, not the criteria wording.`,
                      constraints: `RESPONSE TEXT TO CHECK:
"{response}"

CONSTRAINTS (what should NOT be in the response):
{constraints}

Question: Does the RESPONSE TEXT violate any constraints?

Examine ONLY the response text, not the constraint wording itself. Report violations clearly.`
                    })
                  }}
                  className="delete-test-btn"
                >
                  🔄 Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTestLibrary && (
        <div className="test-library-modal">
          <div className="test-library-content">
            <div className="test-library-header">
              <h2>📚 Saved Test Cases</h2>
              <button onClick={() => setShowTestLibrary(false)} className="close-btn">✕</button>
            </div>
            <div className="test-list">
              {savedTests.map((test) => (
                <div key={test.id} className="test-item">
                  <div className="test-item-content">
                    <div className="test-item-header">
                      {(test.models || [test.model]).map((modelName, idx) => (
                        <span key={idx} className="test-model-badge">{modelName}</span>
                      ))}
                    </div>
                    <div className="test-item-prompt">
                      <strong>Prompt:</strong> {test.prompt}
                    </div>
                    {test.expectedOutput && (
                      <div className="test-item-expected">
                        <strong>Expected:</strong> {test.expectedOutput}
                      </div>
                    )}
                    {test.constraints && (
                      <div className="test-item-constraints">
                        <strong>Constraints:</strong> {test.constraints}
                      </div>
                    )}
                  </div>
                  <div className="test-item-actions">
                    <button onClick={() => loadTest(test)} className="load-test-btn">
                      📥 Load
                    </button>
                    <button onClick={() => deleteTest(test.id)} className="delete-test-btn">
                      <span style={{filter: 'brightness(0) invert(1)'}}>🗑️</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="eval-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="model-selection-header">
                <label htmlFor="model">Model Selection</label>
                <div className="header-actions">
                  <button 
                    type="button"
                    onClick={() => setCompareMode(!compareMode)} 
                    className={`compare-toggle ${compareMode ? 'active' : ''}`}
                  >
                    {compareMode ? '☑️ Compare Mode' : '☐ Compare Mode'}
                  </button>
                  {savedTests.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setShowTestLibrary(!showTestLibrary)} 
                      className="test-library-btn-header"
                    >
                      📚 Test Library ({savedTests.length})
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setShowPromptConfig(!showPromptConfig)} 
                    className="config-prompt-btn"
                  >
                    ⚙️ Configure AI Judge
                  </button>
                </div>
              </div>
              
              {!compareMode ? (
                <select 
                  id="model"
                  value={model} 
                  onChange={(e) => setModel(e.target.value)}
                  className="model-select"
                >
                <optgroup label="Anthropic (Claude)">
                  <option value="claude-sonnet-4.5">Claude Sonnet 4.5 ⚡ Latest</option>
                  <option value="claude-4-opus">Claude 4 Opus</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4.1">GPT-4.1 ⚡ Latest (1M tokens)</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (cheap)</option>
                </optgroup>
                <optgroup label="Open Source">
                  <option value="deepseek-r1">DeepSeek R1 (reasoning)</option>
                  <option value="llama-4-maverick">LLaMA 4 Maverick (code)</option>
                </optgroup>
                </select>
              ) : (
                <div className="model-checkboxes">
                  {allModels.map(m => (
                    <label key={m.id} className="model-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(m.id)}
                        onChange={() => toggleModelSelection(m.id)}
                      />
                      <span className="model-name">{m.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="prompt">Prompt</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt to test..."
                rows="3"
                className="prompt-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expected">Expected Output (Optional)</label>
              <textarea
                id="expected"
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                placeholder="What response do you expect? Leave empty if just exploring..."
                rows="2"
                className="prompt-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="constraints">
                Constraints - What NOT to include (Optional)
                <span className="label-hint">Examples: no explanations, avoid code, max 50 words</span>
              </label>
              <textarea
                id="constraints"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="no explanations, avoid technical jargon, max 20 words"
                rows="2"
                className="prompt-input"
              />
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <div className="button-group">
              <button type="submit" disabled={isLoading || !prompt.trim()} className="submit-btn">
                {isLoading ? '⏳ Processing...' : '🚀 Run Evaluation'}
              </button>
              {responses.length > 0 && (
                <button type="button" onClick={clearHistory} className="clear-btn">
                  <span style={{filter: 'brightness(0) invert(1)'}}>🗑️</span> Clear History
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="results-section">
          {responses.length === 0 ? (
            <div className="empty-state">
              <p>No evaluations yet. Enter a prompt above to get started!</p>
            </div>
          ) : (
            <div className="comparison-grid">
              {/* Model Headers */}
              <div className="comparison-row">
                <div className="row-label">Model</div>
                {responses.map((result) => (
                  <div key={`model-${result.id}`} className="row-content">
                    <span className="model-badge">{result.model}</span>
                    <span style={{marginLeft: '1rem', color: '#666', fontSize: '0.9em'}}>
                      {result.metrics.responseTime}ms • {result.metrics.tokenCount} tokens
                    </span>
                  </div>
                ))}
              </div>

              {/* Response */}
              <div className="comparison-row">
                <div className="row-label">Response</div>
                {responses.map((result) => (
                  <div key={`response-${result.id}`} className="row-content">
                    {result.response}
                  </div>
                ))}
              </div>

              {/* Expected Output */}
              {responses[0]?.expectedOutput && (
                <div className="comparison-row">
                  <div className="row-label">Expected</div>
                  {responses.map((result) => (
                    <div key={`expected-${result.id}`} className="row-content" style={{background: '#fffbea'}}>
                      {result.expectedOutput}
                    </div>
                  ))}
                </div>
              )}

              {/* Automated Checks */}
              {responses[0]?.structuralChecks?.map((_, checkIdx) => (
                <div key={`check-${checkIdx}`} className="comparison-row">
                  <div className="row-label">{responses[0].structuralChecks[checkIdx].name}</div>
                  {responses.map((result) => {
                    const check = result.structuralChecks[checkIdx]
                    return (
                      <div key={`check-${result.id}-${checkIdx}`} className="row-content" style={{
                        background: check.passed ? '#e8f5e9' : '#ffebee'
                      }}>
                        <span>{check.passed ? '✅' : '❌'}</span> {check.details}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Save Button */}
              <div className="comparison-row">
                <div className="row-label"></div>
                <div className="row-content" style={{gridColumn: '2 / -1', textAlign: 'center'}}>
                  <button onClick={() => saveAsTestCase(responses[0])} className="save-test-btn">
                    💾 Save as Test Case (includes all {responses.length} model{responses.length > 1 ? 's' : ''})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
