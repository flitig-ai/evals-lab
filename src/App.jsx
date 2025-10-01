import React, { useState, useEffect } from 'react'
import './App.css'
import { callAIModel } from './api'

function App() {
  const [testCaseName, setTestCaseName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  const [requirements, setRequirements] = useState('')
  const [avoid, setAvoid] = useState('')
  const [model, setModel] = useState('claude-sonnet-4.5')
  const [responses, setResponses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedTests, setSavedTests] = useState([])
  const [showTestLibrary, setShowTestLibrary] = useState(false)
  const [selectedModels, setSelectedModels] = useState([])
  const [showPromptConfig, setShowPromptConfig] = useState(false)
  const [evaluationPrompts, setEvaluationPrompts] = useState({
    matchesExpected: `RESPONSE TEXT TO EVALUATE:
"{response}"

EXPECTED OUTPUT CRITERIA:
"{expectedOutput}"

Does the RESPONSE TEXT meet the EXPECTED OUTPUT CRITERIA?

EVALUATION INSTRUCTIONS:
1. Break down the criteria into specific, testable requirements
2. For each requirement, examine the actual response text and gather evidence
3. If ANY requirement involves counting/measuring (syllables, words, lines, characters, items, format, structure, etc.), you MUST count/measure in the actual response and show your calculation
4. Do NOT trust claims in the response - verify everything that can be verified
5. Mark each requirement: ✓ (met), ✗ (not met), or ~ (partially met)
6. Base your final determination ONLY on your analysis, not on assumptions

Be strict and literal. Focus on what the response actually contains, not what it claims to contain.`,
    
    constraints: `RESPONSE TEXT TO CHECK:
"{response}"

CONSTRAINTS (what should NOT be in the response):
{constraints}

Does the RESPONSE TEXT violate any of these constraints?

EVALUATION INSTRUCTIONS:
1. Examine ONLY the response text itself, not the constraint descriptions
2. Check each constraint separately
3. Mark each as ✓ (no violation) or ✗ (violation found)
4. Provide specific evidence for any violations`
  })

  const allModels = [
    { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', group: 'Anthropic' },
    { id: 'claude-opus-4.1', name: 'Claude Opus 4.1', group: 'Anthropic' },
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', group: 'Anthropic' },
    { id: 'claude-opus-4', name: 'Claude Opus 4', group: 'Anthropic' },
    { id: 'claude-sonnet-3.7', name: 'Claude Sonnet 3.7', group: 'Anthropic' },
    { id: 'claude-opus-3.7', name: 'Claude Opus 3.7', group: 'Anthropic' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (New)', group: 'Anthropic' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', group: 'Anthropic' },
    { id: 'claude-code', name: 'Claude Code (agentic)', group: 'Anthropic' },
    { id: 'gpt-5', name: 'GPT-5', group: 'OpenAI' },
    { id: 'gpt-5-mini', name: 'GPT-5-mini', group: 'OpenAI' },
    { id: 'gpt-5-nano', name: 'GPT-5-nano', group: 'OpenAI' },
    { id: 'gpt-5-chat', name: 'GPT-5-chat', group: 'OpenAI' },
    { id: 'gpt-5-codex', name: 'GPT-5-codex', group: 'OpenAI' },
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
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        // Allow unchecking
        return prev.filter(m => m !== modelId)
      } else if (prev.length < 3) {
        // Only allow checking if less than 3 selected
        return [...prev, modelId]
      }
      // Already have 3 selected, don't add more
      return prev
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsLoading(true)
    setError('')
    
    // Clear previous results before running new evaluation
    setResponses([])
    
    try {
      const modelsToTest = selectedModels.length > 0 ? selectedModels : [model]
      
      if (selectedModels.length === 0) {
        setError('Please select at least one model')
        setIsLoading(false)
        return
      }

      const results = []
      
      for (const testModel of modelsToTest) {
        const result = await callAIModel(prompt, testModel)
        const structuralChecks = await runStructuralChecksWithConstraints(result.response, expectedOutput, prompt, requirements, avoid)
        
        const newResponse = {
          id: Date.now() + Math.random(),
          testCaseName: testCaseName,
          prompt: prompt,
          expectedOutput: expectedOutput,
          requirements: requirements,
          avoid: avoid,
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
      // Keep form filled for iteration
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

  // AI-based requirement checking
  const checkRequirementsWithAI = async (response, requirements) => {
    if (!requirements) return null
    
    const prompt = `RESPONSE TEXT TO CHECK:
"${response}"

REQUIREMENTS (what MUST be included):
${requirements}

Question: Does the RESPONSE TEXT include all the required elements?

Examine the response text and verify each requirement is met.`
    
    const requirementEval = await runAIEvaluation(response, prompt)
    
    return {
      name: 'Requirements Met',
      result: requirementEval.result,
      passed: requirementEval.passed,
      details: requirementEval.details,
      type: 'ai-judge'
    }
  }

  // AI-based avoid checking
  const checkAvoidWithAI = async (response, avoid) => {
    if (!avoid) return null
    
    const prompt = `RESPONSE TEXT TO CHECK:
"${response}"

AVOID (what should NOT be in the response):
${avoid}

Question: Does the RESPONSE TEXT violate any avoid constraints?

Examine ONLY the response text, not the constraint wording itself. Report violations clearly.`
    
    const avoidEval = await runAIEvaluation(response, prompt)
    
    return {
      name: 'Avoid Compliance',
      result: avoidEval.result,
      passed: avoidEval.passed,
      details: avoidEval.details,
      type: 'ai-judge'
    }
  }

  const runAIEvaluation = async (response, criteria) => {
    try {
      const evalResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response, criteria })
      })
      
      if (!evalResponse.ok) {
        const errorData = await evalResponse.json().catch(() => ({}))
        const errorMsg = errorData.error || `HTTP ${evalResponse.status}: ${evalResponse.statusText}`
        return { result: 'FAIL', details: `AI evaluation failed: ${errorMsg}`, passed: false }
      }
      
      const evalResult = await evalResponse.json()
      return {
        result: evalResult.result, // PASS, PARTIAL, or FAIL
        details: evalResult.details,
        passed: evalResult.result === 'PASS' // For backward compatibility with existing checks
      }
    } catch (error) {
      return { result: 'FAIL', details: `AI evaluation error: ${error.message}`, passed: false }
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
      result: semanticEval.result,
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
  
  const runStructuralChecksWithConstraints = async (response, expectedOutput, prompt, requirements, avoid) => {
    const checks = await runStructuralChecks(response, expectedOutput, prompt)
    
    // Add AI-based requirement check if requirements are provided
    if (requirements) {
      const requirementCheck = await checkRequirementsWithAI(response, requirements)
      if (requirementCheck) {
        checks.push(requirementCheck)
      }
    }
    
    // Add AI-based avoid check if avoid constraints are provided
    if (avoid) {
      const avoidCheck = await checkAvoidWithAI(response, avoid)
      if (avoidCheck) {
        checks.push(avoidCheck)
      }
    }
    
    return checks
  }

  const saveAsTestCase = (response) => {
    // Use current testCaseName from state, fallback to response, then timestamp
    const finalTestCaseName = testCaseName?.trim() || response.testCaseName?.trim() || `Test-${Date.now()}`
    
    const testCase = {
      id: Date.now(),
      testCaseName: finalTestCaseName,
      prompt: response.prompt,
      expectedOutput: response.expectedOutput || response.response,
      requirements: response.requirements,
      avoid: response.avoid,
      model: response.model,
      models: selectedModels.length > 0 ? selectedModels : [response.model]
    }
    const updated = [...savedTests, testCase]
    setSavedTests(updated)
    localStorage.setItem('evalTests', JSON.stringify(updated))
    alert('Test case saved!')
  }

  const loadTest = (test) => {
    setTestCaseName(test.testCaseName || '')
    setPrompt(test.prompt)
    setExpectedOutput(test.expectedOutput || '')
    setRequirements(test.requirements || '')
    setAvoid(test.avoid || '')
    
    // Load saved models if available
    if (test.models && test.models.length > 0) {
      setSelectedModels(test.models)
    } else {
      setSelectedModels([test.model])
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

Does the RESPONSE TEXT meet the EXPECTED OUTPUT CRITERIA?

EVALUATION INSTRUCTIONS:
1. Break down the criteria into specific, testable requirements
2. For each requirement, examine the actual response text and gather evidence
3. If ANY requirement involves counting/measuring (syllables, words, lines, characters, items, format, structure, etc.), you MUST count/measure in the actual response and show your calculation
4. Do NOT trust claims in the response - verify everything that can be verified
5. Mark each requirement: ✓ (met), ✗ (not met), or ~ (partially met)
6. Base your final determination ONLY on your analysis, not on assumptions

Be strict and literal. Focus on what the response actually contains, not what it claims to contain.`,
                      constraints: `RESPONSE TEXT TO CHECK:
"{response}"

CONSTRAINTS (what should NOT be in the response):
{constraints}

Does the RESPONSE TEXT violate any of these constraints?

EVALUATION INSTRUCTIONS:
1. Examine ONLY the response text itself, not the constraint descriptions
2. Check each constraint separately
3. Mark each as ✓ (no violation) or ✗ (violation found)
4. Provide specific evidence for any violations`
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
                      {test.testCaseName && (
                        <div style={{fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem', color: '#667eea'}}>
                          {test.testCaseName}
                        </div>
                      )}
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
                    {test.requirements && (
                      <div className="test-item-expected">
                        <strong>Requirements:</strong> {test.requirements}
                      </div>
                    )}
                    {test.avoid && (
                      <div className="test-item-constraints">
                        <strong>Avoid:</strong> {test.avoid}
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
              
              <div>
                <div style={{marginBottom: '0.5rem', fontSize: '0.9rem', color: selectedModels.length >= 3 ? '#d32f2f' : '#666'}}>
                  Selected: {selectedModels.length}/3 models {selectedModels.length >= 3 && '(max reached)'}
                </div>
                <div className="model-checkboxes-grouped">
                  <div className="model-group">
                    <div className="model-group-header">Anthropic</div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-start', alignItems: 'center'}}>
                      {allModels.filter(m => m.group === 'Anthropic').map(m => (
                        <label key={m.id} className="model-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedModels.includes(m.id)}
                            onChange={() => toggleModelSelection(m.id)}
                            disabled={!selectedModels.includes(m.id) && selectedModels.length >= 3}
                          />
                          <span className="model-name" style={{opacity: (!selectedModels.includes(m.id) && selectedModels.length >= 3) ? 0.4 : 1}}>{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="model-group">
                    <div className="model-group-header">OpenAI</div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-start', alignItems: 'center'}}>
                      {allModels.filter(m => m.group === 'OpenAI').map(m => (
                        <label key={m.id} className="model-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedModels.includes(m.id)}
                            onChange={() => toggleModelSelection(m.id)}
                            disabled={!selectedModels.includes(m.id) && selectedModels.length >= 3}
                          />
                          <span className="model-name" style={{opacity: (!selectedModels.includes(m.id) && selectedModels.length >= 3) ? 0.4 : 1}}>{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="testCaseName">Test Case Name / ID (Optional)</label>
              <input
                type="text"
                id="testCaseName"
                value={testCaseName}
                onChange={(e) => setTestCaseName(e.target.value)}
                placeholder="e.g., TC-001: Edge case empty input, swedish_haiku_test"
                className="prompt-input"
                style={{height: 'auto', padding: '0.75rem'}}
              />
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
              <label htmlFor="requirements">
                Requirements - What MUST be included (Optional)
                <span className="label-hint">Examples: include customer name, mention refund policy, cite sources</span>
              </label>
              <textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="include customer name, mention refund amount, provide timeline"
                rows="2"
                className="prompt-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="avoid">
                Avoid - What should NOT be included (Optional)
                <span className="label-hint">Examples: no explanations, avoid code, no technical jargon</span>
              </label>
              <textarea
                id="avoid"
                value={avoid}
                onChange={(e) => setAvoid(e.target.value)}
                placeholder="no explanations, avoid technical jargon, no marketing language"
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
              {/* Test Case Name */}
              {responses[0]?.testCaseName && (
                <div className="comparison-row">
                  <div className="row-label">Test Case</div>
                  {responses.map((result) => (
                    <div key={`testname-${result.id}`} className="row-content" style={{background: '#f0f4ff', fontWeight: 'bold', color: '#667eea'}}>
                      {result.testCaseName}
                    </div>
                  ))}
                </div>
              )}
              
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
                  <div key={`response-${result.id}`} className="row-content" style={{whiteSpace: 'pre-line'}}>
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
              {responses[0]?.structuralChecks?.map((_, checkIdx) => {
                const isMatchesExpectedCheck = responses[0].structuralChecks[checkIdx].name === 'Matches Expected Output'
                return (
                  <React.Fragment key={`check-fragment-${checkIdx}`}>
                    <div key={`check-${checkIdx}`} className="comparison-row">
                      <div className="row-label">{responses[0].structuralChecks[checkIdx].name}</div>
                      {responses.map((result) => {
                        const check = result.structuralChecks[checkIdx]
                        const checkResult = check.result || (check.passed ? 'PASS' : 'FAIL')
                        const bgColor = checkResult === 'PASS' ? '#e8f5e9' : checkResult === 'PARTIAL' ? '#fff9c4' : '#ffebee'
                        const icon = checkResult === 'PASS' ? '✅' : checkResult === 'PARTIAL' ? '⚠️' : '❌'
                        return (
                          <div key={`check-${result.id}-${checkIdx}`} className="row-content" style={{
                            background: bgColor,
                            whiteSpace: 'pre-line'
                          }}>
                            <span>{icon}</span> {check.details}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Show Requirements and Avoid after the first check (Matches Expected Output) */}
                    {isMatchesExpectedCheck && responses[0]?.requirements && (
                      <div className="comparison-row">
                        <div className="row-label">Requirements</div>
                        {responses.map((result) => (
                          <div key={`requirements-${result.id}`} className="row-content" style={{background: '#e3f2fd'}}>
                            {result.requirements}
                          </div>
                        ))}
                      </div>
                    )}
                    {isMatchesExpectedCheck && responses[0]?.avoid && (
                      <div className="comparison-row">
                        <div className="row-label">Avoid</div>
                        {responses.map((result) => (
                          <div key={`avoid-${result.id}`} className="row-content" style={{background: '#fff3e0'}}>
                            {result.avoid}
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}

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
