"""Contrato HTTP del escáner, sin llamadas pagas ni escrituras en la base."""
import json
from io import BytesIO

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import hotel
from app.services import receipt_service as service


@pytest.fixture
def client():
    hotel.app.dependency_overrides[hotel.verificar_token] = lambda: {"rol": "empleado"}
    yield TestClient(hotel.app)
    hotel.app.dependency_overrides.clear()


@pytest.fixture
def photo():
    output = BytesIO()
    Image.new("RGB", (80, 100), "white").save(output, "JPEG")
    return output.getvalue()


def mock_ai(monkeypatch, result=None, status=200, incomplete=False, timeout=False):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-only")
    async def respond(request):
        payload = json.loads(request.content)
        assert str(request.url) == "https://api.anthropic.com/v1/messages"
        assert request.headers["x-api-key"] == "test-only"
        assert request.headers["anthropic-version"] == "2023-06-01"
        assert payload["model"] == "claude-sonnet-4-6"
        assert payload["output_config"]["format"]["type"] == "json_schema"
        source = payload["messages"][0]["content"][0]["source"]
        assert source["type"] == "base64"
        assert source["media_type"] == "image/jpeg"
        assert source["data"]
        if timeout:
            raise httpx.ReadTimeout("test", request=request)
        return httpx.Response(status, json={
            "stop_reason": "max_tokens" if incomplete else "end_turn",
            "content": [{"type": "text", "text": json.dumps(result)}],
        })
    original = httpx.AsyncClient
    monkeypatch.setattr(service.httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(respond), **kw))


def receipt():
    return dict(es_comprobante=True, descripcion="Compra de limpieza", monto=12345.67,
                categoria="insumos", forma_pago=None, moneda="ARS", advertencias=[])


def scan(client, photo):
    return client.post("/gastos/escanear", files={"archivo": ("ticket.jpg", photo, "image/jpeg")})


def test_requires_authentication(photo):
    assert scan(TestClient(hotel.app), photo).status_code == 401


def test_returns_reviewable_draft(client, photo, monkeypatch):
    mock_ai(monkeypatch, receipt())
    response = scan(client, photo)
    assert response.status_code == 200
    assert response.json()["monto"] == 12345.67
    assert response.json()["forma_pago"] is None


def test_missing_key(client, photo, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert scan(client, photo).status_code == 503


def test_invalid_content(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-only")
    assert scan(client, b"not an image").status_code == 400
    assert scan(client, b"").status_code == 400
    assert client.post("/gastos/escanear", files={"archivo": ("a.pdf", b"pdf", "application/pdf")}).status_code == 400


def test_size_limit(client):
    assert scan(client, b"x" * (service.MAX_IMAGE_BYTES + 1)).status_code == 413


@pytest.mark.parametrize("currency", ["USD", "BRL", None])
def test_foreign_or_unknown_currency_needs_manual_amount(client, photo, monkeypatch, currency):
    data = receipt()
    data["moneda"] = currency
    mock_ai(monkeypatch, data)
    result = scan(client, photo).json()
    assert result["monto"] is None
    assert result["advertencias"]


def test_not_a_receipt(client, photo, monkeypatch):
    data = receipt()
    data["es_comprobante"] = False
    mock_ai(monkeypatch, data)
    assert scan(client, photo).status_code == 422


@pytest.mark.parametrize("options,expected", [({"status": 429}, 429), ({"status": 401}, 502), ({"timeout": True}, 504), ({"incomplete": True}, 502)])
def test_provider_errors(client, photo, monkeypatch, options, expected):
    mock_ai(monkeypatch, receipt(), **options)
    assert scan(client, photo).status_code == expected


def test_invalid_model_output(client, photo, monkeypatch):
    mock_ai(monkeypatch, {"monto": "invalid"})
    assert scan(client, photo).status_code == 502


@pytest.mark.parametrize("amount", [-1, 0, float("inf")])
def test_invalid_amount_is_not_suggested(client, photo, monkeypatch, amount):
    data = receipt()
    data["monto"] = amount
    mock_ai(monkeypatch, data)
    response = scan(client, photo)
    assert response.status_code == 200
    assert response.json()["monto"] is None
