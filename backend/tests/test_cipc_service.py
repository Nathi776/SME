import os
from unittest import mock
import pytest
import httpx
from services import cipc_service


def test_format_validation():
    # Valid formats
    res = cipc_service.verify("2019/045321/07")
    assert res.verified is None or res.verified is True or res.verified is False
    assert res.error is None
    
    # Invalid formats
    res = cipc_service.verify("12345")
    assert res.verified is False
    assert res.auto_approved is False
    assert "not a valid SA company registration" in res.error
    assert res.source == "pattern_only"

    res = cipc_service.verify("2019-045321-07")
    assert res.verified is False
    assert "not a valid SA company registration" in res.error


def test_manual_review_fallback():
    # If no env variables set, should queue for manual review
    with mock.patch.dict(os.environ, {"CIPC_API_URL": "", "CIPC_API_KEY": ""}):
        res = cipc_service.verify("2019/045321/07")
        assert res.verified is None
        assert res.auto_approved is False
        assert res.source == "manual_review"
        assert res.error is None


@mock.patch("httpx.Client.get")
def test_live_api_success(mock_get):
    # Setup mock live response
    mock_response = mock.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "found": True,
        "company_name": "Test Engineering Pty Ltd",
        "registration_number": "2019/045321/07",
        "status": "In Business",
        "registration_date": "2019-06-12",
        "directors": [{"name": "John Doe"}]
    }
    mock_get.return_value = mock_response

    with mock.patch.dict(os.environ, {"CIPC_API_URL": "http://mockapi.com", "CIPC_API_KEY": "secret"}):
        res = cipc_service.verify("2019/045321/07", company_name="Test Engineering")
        assert res.verified is True
        assert res.auto_approved is True
        assert res.company_name == "Test Engineering Pty Ltd"
        assert res.status == "In Business"
        assert res.director == "John Doe"
        assert res.source == "api"
        assert res.error is None


@mock.patch("httpx.Client.get")
def test_live_api_not_found(mock_get):
    # Setup mock live response for not found
    mock_response = mock.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "found": False
    }
    mock_get.return_value = mock_response

    with mock.patch.dict(os.environ, {"CIPC_API_URL": "http://mockapi.com", "CIPC_API_KEY": "secret"}):
        res = cipc_service.verify("2019/045321/07")
        assert res.verified is False
        assert res.auto_approved is False
        assert res.source == "api"
        assert "not found in CIPC registry" in res.error


@mock.patch("httpx.Client.get")
def test_live_api_timeout_fallback(mock_get):
    mock_get.side_effect = httpx.TimeoutException("mock timeout")

    with mock.patch.dict(os.environ, {"CIPC_API_URL": "http://mockapi.com", "CIPC_API_KEY": "secret"}):
        res = cipc_service.verify("2019/045321/07")
        assert res.verified is None
        assert res.auto_approved is False
        assert res.source == "manual_review"
        assert "timed out" in res.error
