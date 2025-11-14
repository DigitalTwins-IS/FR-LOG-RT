/**
 * Página de Restablecimiento de Contraseña
 * Validación por correo electrónico con código de 6 dígitos
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { authService } from '../services/api';
import { APP_CONFIG } from '../config';

const ForgotPasswordPage = () => {
  // Estado general
  const [step, setStep] = useState('forgot'); // 'forgot' o 'reset'
  
  // Estado para solicitar reset
  const [email, setEmail] = useState('');
  
  // Estado para reset
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estado UI
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  
  const navigate = useNavigate();

  // Paso 1: Solicitar restablecimiento por correo
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Validación por correo (método simple)
      const response = await authService.forgotPassword(
        email,
        null,  // Sin método adicional de verificación
        null,  // Sin teléfono
        null   // Sin pregunta de seguridad
      );
      
      // Código generado - cambiar al formulario de validación
      setMessage(response.message);
      
      // Si se recibió código en la respuesta (solo en desarrollo), mostrarlo
      if (response.reset_code) {
        // Código de 6 dígitos mostrado en pantalla (desarrollo - email falló)
        setResetCode(response.reset_code);
        setShowCode(true);
      }
      
      // SIEMPRE cambiar al formulario de validación
      // El usuario debe ingresar el código que recibió por email
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al solicitar restablecimiento de contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Restablecer contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validaciones
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!resetCode) {
      setError('Ingresa el código de verificación que recibiste por email');
      return;
    }

    // Validar que el código tenga exactamente 6 dígitos
    if (resetCode.length !== 6 || !/^\d{6}$/.test(resetCode)) {
      setError('El código debe tener exactamente 6 dígitos numéricos');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(
        email,
        resetCode,
        null,  // No usar token
        newPassword
      );
      setMessage(response.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('Copiado al portapapeles');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="w-100" style={{ maxWidth: '500px' }}>
        <Card>
          <Card.Body>
            <div className="text-center mb-4">
              <h2>{APP_CONFIG.name}</h2>
              <p className="text-muted">
                {step === 'forgot' ? 'Restablecer Contraseña' : 'Nueva Contraseña'}
              </p>
              <small className="text-muted">
                🔒 Verificación adicional requerida para mayor seguridad
              </small>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            {step === 'forgot' ? (
              <Form onSubmit={handleForgotPassword}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Ingrese su email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Método de Verificación (Opcional)</Form.Label>
                  <small className="text-muted d-block mb-2">
                    Se enviará un código de verificación a tu correo electrónico
                  </small>
                  <div className="p-3 bg-light border rounded">
                    <div className="d-flex align-items-center">
                      <span className="me-2" style={{ fontSize: '1.5rem' }}>📧</span>
                      <div>
                        <strong>Validación por Correo</strong>
                        <br />
                        <small className="text-muted">
                          Recibirás un código de 6 dígitos en tu email. El código es válido por 10 minutos.
                        </small>
                      </div>
                    </div>
                  </div>
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? 'Verificando...' : 'Solicitar Restablecimiento'}
                </Button>

                <div className="mt-3 text-center">
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/login')}
                    className="p-0"
                  >
                    Volver al inicio de sesión
                  </Button>
                </div>
              </Form>
            ) : (
              <Form onSubmit={handleResetPassword}>
                <div className="alert alert-info mb-3">
                  <small>
                    📧 Revisa tu correo electrónico <strong>{email}</strong> y tu carpeta de spam.
                    El código es válido por 10 minutos.
                  </small>
                </div>

                <Form.Group className="mb-3" controlId="code">
                  <Form.Label>
                    Código de Verificación (6 dígitos)
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showCode ? "text" : "password"}
                      placeholder="Ej: 123456"
                      value={resetCode || ''}
                      onChange={(e) => {
                        // Solo permitir números y máximo 6 caracteres
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setResetCode(value);
                      }}
                      required
                      autoFocus
                      maxLength={6}
                      pattern="\d{6}"
                      className="text-center font-monospace fs-5"
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowCode(!showCode)}
                      title="Mostrar/Ocultar código"
                    >
                      {showCode ? '👁️' : '👁️‍🗨️'}
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Ingresa el código de 6 dígitos que recibiste por email.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="newPassword">
                  <Form.Label>Nueva Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="confirmPassword">
                  <Form.Label>Confirmar Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Confirme su nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </Button>

                <div className="mt-3 text-center">
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setStep('forgot');
                      setResetCode('');
                      setToken('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowCode(false);
                    }}
                    className="p-0"
                  >
                    Solicitar nuevo código
                  </Button>
                </div>
              </Form>
            )}
          </Card.Body>
        </Card>

        <div className="text-center mt-3">
          <small className="text-muted">
            {APP_CONFIG.name} v{APP_CONFIG.version}
          </small>
        </div>
      </div>
    </Container>
  );
};

export default ForgotPasswordPage;
