<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:232F3E,100:FF9900&height=260&section=header&text=HeatFlood%20Guardian&fontSize=58&fontColor=FFFFFF&animation=fadeIn&fontAlignY=36&desc=Heat%20and%20flood-aware%20urban%20route%20intelligence&descSize=20&descAlignY=58" alt="HeatFlood Guardian" width="100%">

<br>

<a href="http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com">
  <img src="https://img.shields.io/badge/Launch-HeatFlood_Guardian-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white&labelColor=232F3E" alt="Launch HeatFlood Guardian">
</a>

<br><br>

<strong>Live application:</strong> <a href="http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com">http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com</a>

<br><br>

<img src="https://img.shields.io/website?url=http%3A%2F%2Fheatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com&label=App%20status&up_message=online&down_message=offline&up_color=FF9900&down_color=B91C1C&labelColor=232F3E&style=for-the-badge&logo=amazonaws&logoColor=white" alt="App status">
<a href="https://github.com/CyberCodezilla/ENV-entors">
  <img src="https://img.shields.io/badge/Source-ENV--entors-232F3E?style=for-the-badge&logo=github&logoColor=white" alt="Source repository">
</a>
<img src="https://img.shields.io/github/last-commit/CyberCodezilla/ENV-entors?style=for-the-badge&labelColor=232F3E&color=FF9900" alt="Last commit">

<br><br>

<a href="#overview"><img src="https://img.shields.io/badge/Overview-232F3E?style=flat-square" alt="Overview"></a>
<a href="#user-journey"><img src="https://img.shields.io/badge/Journey-232F3E?style=flat-square" alt="Journey"></a>
<a href="#how-a-request-flows"><img src="https://img.shields.io/badge/Lifecycle-232F3E?style=flat-square" alt="Lifecycle"></a>
<a href="#scenario-engine"><img src="https://img.shields.io/badge/Scenarios-232F3E?style=flat-square" alt="Scenarios"></a>
<a href="#architecture"><img src="https://img.shields.io/badge/Architecture-232F3E?style=flat-square" alt="Architecture"></a>
<a href="#built-on-aws"><img src="https://img.shields.io/badge/AWS-232F3E?style=flat-square" alt="AWS"></a>
<a href="#getting-started"><img src="https://img.shields.io/badge/Start-232F3E?style=flat-square" alt="Getting started"></a>
<a href="#roadmap"><img src="https://img.shields.io/badge/Roadmap-232F3E?style=flat-square" alt="Roadmap"></a>

</div>

## Overview

**Every route tells a story. Read it before you leave.**

HeatFlood Guardian is an urban route-intelligence prototype that helps people explore routes with heat and flood risk in mind. Route visualization, risk indicators, evidence inspection, scenario simulation, and community hazard reporting live in a single interface.

**Mission:** make environmental route risks easier to understand before a journey begins.

## Features

| Route Intelligence | Risk Signals | Community and Platform |
|---|---|---|
| Interactive route visualization | Heat-risk indicators | Community hazard reporting |
| Route comparison | Flood-risk indicators | Departure-time exploration |
| Affected-segment highlighting | Evidence drawer for inspection | Backend health-status interface |
| Flood-scenario reroute visualization | Scenario-aware risk display | Serverless AWS architecture |

## User Journey

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpqb3VybmV5CiAgICB0aXRsZSBBIHRyaXAgcGxhbm5lZCB3aXRoIEhlYXRGbG9vZCBHdWFyZGlhbgogICAgc2VjdGlvbiBQbGFuCiAgICAgIE9wZW4gdGhlIGRhc2hib2FyZDogNTogVHJhdmVsZXIKICAgICAgUGljayBvcmlnaW4gYW5kIGRlc3RpbmF0aW9uOiA0OiBUcmF2ZWxlcgogICAgICBDaG9vc2UgYSBkZXBhcnR1cmUgdGltZTogNDogVHJhdmVsZXIKICAgIHNlY3Rpb24gVW5kZXJzdGFuZAogICAgICBDb21wYXJlIGF2YWlsYWJsZSByb3V0ZXM6IDU6IFRyYXZlbGVyLCBHdWFyZGlhbgogICAgICBJbnNwZWN0IHNlZ21lbnQgZXZpZGVuY2U6IDU6IFRyYXZlbGVyLCBHdWFyZGlhbgogICAgc2VjdGlvbiBEZWNpZGUKICAgICAgUnVuIGEgZmxvb2Qgc2NlbmFyaW86IDQ6IFRyYXZlbGVyLCBHdWFyZGlhbgogICAgICBQaWNrIGEgcm91dGUgYW5kIGdvOiA1OiBUcmF2ZWxlcgogICAgc2VjdGlvbiBDb250cmlidXRlCiAgICAgIFJlcG9ydCBhIGhhemFyZDogNDogVHJhdmVsZXIsIENvbW11bml0eQo=?type=png&bgColor=0d1117" alt="User journey diagram: plan, understand, decide, contribute">
</p>

## How a Request Flows

What happens between pressing search and seeing a risk overlay.

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpzZXF1ZW5jZURpYWdyYW0KICAgIGF1dG9udW1iZXIKICAgIGFjdG9yIFVzZXIgYXMgVHJhdmVsZXIKICAgIHBhcnRpY2lwYW50IFdlYiBhcyBEYXNoYm9hcmQKICAgIHBhcnRpY2lwYW50IEFQSSBhcyBBUEkgR2F0ZXdheQogICAgcGFydGljaXBhbnQgRm4gYXMgTGFtYmRhCiAgICBwYXJ0aWNpcGFudCBEQiBhcyBEeW5hbW9EQgogICAgcGFydGljaXBhbnQgTUwgYXMgU2FnZU1ha2VyCiAgICBVc2VyLT4-V2ViOiBPcmlnaW4sIGRlc3RpbmF0aW9uLCBkZXBhcnR1cmUgdGltZQogICAgV2ViLT4-QVBJOiBSZXF1ZXN0IHJvdXRlIHJpc2sKICAgIEFQSS0-PkZuOiBJbnZva2UgaGFuZGxlcgogICAgRm4tPj5EQjogUmVhZCBob3RzcG90cyBhbmQgaW5jaWRlbnRzCiAgICBEQi0tPj5GbjogTWF0Y2hpbmcgcmVjb3JkcwogICAgb3B0IE1MIHNjb3JpbmcgY29uZmlndXJlZAogICAgICAgIEZuLT4-TUw6IFNjb3JlIHJvdXRlIHNlZ21lbnRzCiAgICAgICAgTUwtLT4-Rm46IFJpc2sgc2NvcmVzCiAgICBlbmQKICAgIEZuLT4-Rm46IFNjb3Jpbmcgb3IgZmFsbGJhY2sgbG9naWMKICAgIEZuLS0-PkFQSTogUm91dGUgcmlzayBhbmQgZXZpZGVuY2UKICAgIEFQSS0tPj5XZWI6IEpTT04gcmVzcG9uc2UKICAgIFdlYi0tPj5Vc2VyOiBPdmVybGF5LCBhbHRlcm5hdGl2ZXMsIGV2aWRlbmNlCiAgICBOb3RlIG92ZXIgV2ViLE1MOiBJbnRlbmRlZCBkZXNpZ24uIEludGVncmF0aW9ucyBkZXBlbmQgb24gdGhlIGFjdGl2ZSBkZXBsb3ltZW50Lgo=?type=png&bgColor=0d1117" alt="Sequence diagram of a route risk request through Dashboard, API Gateway, Lambda, DynamoDB and SageMaker">
</p>

### Risk Analysis Workflow

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpmbG93Y2hhcnQgVEQKICAgIEFbUm91dGUgcmVxdWVzdF0gLS0-IEJbUmV0cmlldmUgcm91dGUgaW5mb3JtYXRpb25dCiAgICBCIC0tPiBDW0dhdGhlciBoZWF0IGFuZCBmbG9vZCBzaWduYWxzXQogICAgQyAtLT4gRHtNTCBzY29yaW5nIGF2YWlsYWJsZT99CiAgICBEIC0tPnxZZXN8IEVbU2NvcmUgd2l0aCBTYWdlTWFrZXJdCiAgICBEIC0tPnxOb3wgRltDb25maWd1cmVkIGZhbGxiYWNrIGxvZ2ljXQogICAgRSAtLT4gR1tSaXNrIGluZGljYXRvcnMgcGVyIHNlZ21lbnRdCiAgICBGIC0tPiBHCiAgICBHIC0tPiBIW1Jpc2sgb3ZlcmxheSBvbiB0aGUgbWFwXQogICAgSCAtLT4gSVtJbnNwZWN0IHNlZ21lbnQgZXZpZGVuY2VdCiAgICBJIC0tPiBKW0NvbXBhcmUgYWx0ZXJuYXRpdmVzXQogICAgSiAtLT4gSyhbVXNlciBtYWtlcyB0aGUgZmluYWwgZGVjaXNpb25dKQogICAgY2xhc3MgQSxCLEMsRSxGLEcsSCxJLEosSyBhd3MKICAgIGNsYXNzIEQgaG90CiAgICBjbGFzc0RlZiBhd3MgZmlsbDojMjMyRjNFLHN0cm9rZTojRkY5OTAwLHN0cm9rZS13aWR0aDoycHgsY29sb3I6I0ZGRkZGRgogICAgY2xhc3NEZWYgaG90IGZpbGw6I0ZGOTkwMCxzdHJva2U6IzIzMkYzRSxzdHJva2Utd2lkdGg6MnB4LGNvbG9yOiMyMzJGM0UKICAgIGNsYXNzRGVmIGFsZXJ0IGZpbGw6I0I5MUMxQyxzdHJva2U6I0ZDQTVBNSxzdHJva2Utd2lkdGg6MnB4LGNvbG9yOiNGRkZGRkYKICAgIGxpbmtTdHlsZSBkZWZhdWx0IHN0cm9rZTojRkY5OTAwLHN0cm9rZS13aWR0aDoycHgK?type=png&bgColor=0d1117" alt="Flowchart of the risk analysis workflow from route request to final decision">
</p>

The displayed result depends on the route data, the available environmental signals, and the configured scoring or fallback logic. It is not a guarantee of real-world safety.

## Scenario Engine

A prepared flood scenario flags a flooded underpass as impassable and visualizes an alternative route. The routing outcome depends on the scenario implementation and the available route data.

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpmbG93Y2hhcnQgVEQKICAgIEEoW0Nob29zZSBhIHNjZW5hcmlvXSkgLS0-IEJbTG9hZCBzY2VuYXJpbyBkYXRhXQogICAgQiAtLT4gQ1tFdmFsdWF0ZSByb3V0ZSBzZWdtZW50c10KICAgIEMgLS0-IER7Rmxvb2RlZCBzZWdtZW50IGRldGVjdGVkP30KICAgIEQgLS0-fFllc3wgRVtGbGFnIGFmZmVjdGVkIHNlZ21lbnRdCiAgICBFIC0tPiBGW01hcmsgc2VnbWVudCBpbXBhc3NhYmxlXQogICAgRiAtLT4gSFtDb21wYXJlIGFsdGVybmF0aXZlIHJvdXRlc10KICAgIEQgLS0-fE5vfCBHW0Rpc3BsYXkgYXZhaWxhYmxlIHJvdXRlXQogICAgRyAtLT4gSAogICAgSCAtLT4gSVtJbnNwZWN0IGF2YWlsYWJsZSBldmlkZW5jZV0KICAgIEkgLS0-IEooW01ha2UgYW4gaW5mb3JtZWQgdHJhdmVsIGRlY2lzaW9uXSkKICAgIGNsYXNzIEEsQixDLEcsSCxJLEogYXdzCiAgICBjbGFzcyBEIGhvdAogICAgY2xhc3MgRSxGIGFsZXJ0CiAgICBjbGFzc0RlZiBhd3MgZmlsbDojMjMyRjNFLHN0cm9rZTojRkY5OTAwLHN0cm9rZS13aWR0aDoycHgsY29sb3I6I0ZGRkZGRgogICAgY2xhc3NEZWYgaG90IGZpbGw6I0ZGOTkwMCxzdHJva2U6IzIzMkYzRSxzdHJva2Utd2lkdGg6MnB4LGNvbG9yOiMyMzJGM0UKICAgIGNsYXNzRGVmIGFsZXJ0IGZpbGw6I0I5MUMxQyxzdHJva2U6I0ZDQTVBNSxzdHJva2Utd2lkdGg6MnB4LGNvbG9yOiNGRkZGRkYKICAgIGxpbmtTdHlsZSBkZWZhdWx0IHN0cm9rZTojRkY5OTAwLHN0cm9rZS13aWR0aDoycHgK?type=png&bgColor=0d1117" alt="Flowchart of the flood scenario: detect flooded segment, mark impassable, compare alternative routes">
</p>

### Scenario Lifecycle

Conceptual states of a demonstration scenario in the interface.

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpzdGF0ZURpYWdyYW0tdjIKICAgIFsqXSAtLT4gSWRsZQogICAgSWRsZSAtLT4gTG9hZGluZzogU2NlbmFyaW8gc2VsZWN0ZWQKICAgIExvYWRpbmcgLS0-IEFjdGl2ZTogRGF0YSByZWFkeQogICAgQWN0aXZlIC0tPiBFdmFsdWF0aW5nOiBBbmFseXplIHNlZ21lbnRzCiAgICBFdmFsdWF0aW5nIC0tPiBSZXJvdXRlZDogU2VnbWVudCBmbGFnZ2VkCiAgICBFdmFsdWF0aW5nIC0tPiBDbGVhcjogTm8gc2VnbWVudCBmbGFnZ2VkCiAgICBSZXJvdXRlZCAtLT4gSW5zcGVjdGluZzogT3BlbiBldmlkZW5jZSBkcmF3ZXIKICAgIENsZWFyIC0tPiBJbnNwZWN0aW5nOiBPcGVuIGV2aWRlbmNlIGRyYXdlcgogICAgSW5zcGVjdGluZyAtLT4gSWRsZTogUmVzZXQgc2NlbmFyaW8KICAgIFJlcm91dGVkIC0tPiBJZGxlOiBSZXNldCBzY2VuYXJpbwogICAgQ2xlYXIgLS0-IElkbGU6IFJlc2V0IHNjZW5hcmlvCg==?type=png&bgColor=0d1117" alt="State diagram of a scenario: idle, loading, active, evaluating, rerouted or clear, inspecting">
</p>

**Important:** the scenario suite is a development and demonstration tool. A simulated incident is not a live emergency alert and does not replace municipal flood warnings, emergency services, or on-ground verification.

## Architecture

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpmbG93Y2hhcnQgVEIKICAgIFUoW1RyYXZlbGVyXSkKICAgIHN1YmdyYXBoIERFTElWRVJZWyJEZWxpdmVyeSJdCiAgICAgICAgQ0ZbQ2xvdWRGcm9udCAtIG9wdGlvbmFsXQogICAgICAgIFMzW1MzIHN0YXRpYyBob3N0aW5nXQogICAgZW5kCiAgICBzdWJncmFwaCBBUFBbIkZyb250ZW5kIC0gTmV4dC5qcyJdCiAgICAgICAgVUlbSW50ZXJhY3RpdmUgZGFzaGJvYXJkXQogICAgICAgIE1BUFtNYXAgYW5kIHJvdXRlc10KICAgICAgICBTSU1bU2NlbmFyaW8gc2ltdWxhdGlvbl0KICAgICAgICBSRVBbSGF6YXJkIHJlcG9ydHNdCiAgICBlbmQKICAgIHN1YmdyYXBoIENMT1VEWyJCYWNrZW5kIC0gQVdTIHNlcnZlcmxlc3MiXQogICAgICAgIENPR1tDb2duaXRvXQogICAgICAgIEFQSUdXW0FQSSBHYXRld2F5XQogICAgICAgIEZOW0xhbWJkYSBmdW5jdGlvbnNdCiAgICAgICAgRERCWyhEeW5hbW9EQildCiAgICAgICAgU1FTW1tTUVMgcXVldWVdXQogICAgICAgIERMUVtbRGVhZC1sZXR0ZXIgcXVldWVdXQogICAgICAgIFNNW1NhZ2VNYWtlciAtIG9wdGlvbmFsXQogICAgZW5kCiAgICBDV1tDbG91ZFdhdGNoXQogICAgVSAtLT4gQ0YKICAgIENGIC0uLT4gUzMKICAgIFUgLS0-IFMzCiAgICBTMyAtLT4gVUkKICAgIFVJIC0tPiBNQVAKICAgIFVJIC0tPiBTSU0KICAgIFVJIC0tPiBSRVAKICAgIFVJIC0tPiBDT0cKICAgIFVJIC0tPiBBUElHVwogICAgQVBJR1cgLS0-IEZOCiAgICBGTiAtLT4gRERCCiAgICBGTiAtLT4gU1FTCiAgICBTUVMgLS4tPnxmYWlsZWQgbWVzc2FnZXN8IERMUQogICAgRk4gLS4tPnxvcHRpb25hbCBzY29yaW5nfCBTTQogICAgRk4gLS4tPnxsb2dzIGFuZCBtZXRyaWNzfCBDVwogICAgRExRIC0uLT4gQ1cKICAgIGNsYXNzIFUsQ0YsUzMsVUksTUFQLFNJTSxSRVAsQ09HLEFQSUdXLFNNLENXIGF3cwogICAgY2xhc3MgRk4sRERCLFNRUyBob3QKICAgIGNsYXNzIERMUSBhbGVydAogICAgc3R5bGUgREVMSVZFUlkgZmlsbDojMUIyNzM1LHN0cm9rZTojRkY5OTAwLGNvbG9yOiNGRkZGRkYKICAgIHN0eWxlIEFQUCBmaWxsOiMxQjI3MzUsc3Ryb2tlOiNGRjk5MDAsY29sb3I6I0ZGRkZGRgogICAgc3R5bGUgQ0xPVUQgZmlsbDojMUIyNzM1LHN0cm9rZTojRkY5OTAwLGNvbG9yOiNGRkZGRkYKICAgIGNsYXNzRGVmIGF3cyBmaWxsOiMyMzJGM0Usc3Ryb2tlOiNGRjk5MDAsc3Ryb2tlLXdpZHRoOjJweCxjb2xvcjojRkZGRkZGCiAgICBjbGFzc0RlZiBob3QgZmlsbDojRkY5OTAwLHN0cm9rZTojMjMyRjNFLHN0cm9rZS13aWR0aDoycHgsY29sb3I6IzIzMkYzRQogICAgY2xhc3NEZWYgYWxlcnQgZmlsbDojQjkxQzFDLHN0cm9rZTojRkNBNUE1LHN0cm9rZS13aWR0aDoycHgsY29sb3I6I0ZGRkZGRgogICAgbGlua1N0eWxlIGRlZmF1bHQgc3Ryb2tlOiNGRjk5MDAsc3Ryb2tlLXdpZHRoOjJweAo=?type=png&bgColor=0d1117" alt="Architecture diagram: S3 and CloudFront delivery, Next.js frontend, API Gateway, Lambda, DynamoDB, SQS with dead-letter queue, Cognito, SageMaker, CloudWatch">
</p>

**Note:** the diagram describes the intended or configured design. It does not, by itself, confirm that every service is deployed or operational in the live application.

### Hazard Report Pipeline

How a community report is meant to travel through the system without being lost.

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQpmbG93Y2hhcnQgVEQKICAgIFIoW1RyYXZlbGVyIGZpbGVzIGEgaGF6YXJkIHJlcG9ydF0pIC0tPiBBUElbQVBJIEdhdGV3YXldCiAgICBBUEkgLS0-IFZbTGFtYmRhIHZhbGlkYXRlIGFuZCBlbnF1ZXVlXQogICAgViAtLT4gUVtbU1FTIHF1ZXVlXV0KICAgIFEgLS0-IFBbTGFtYmRhIHByb2Nlc3MgcmVwb3J0XQogICAgUCAtLT4gT0t7UHJvY2Vzc2VkP30KICAgIE9LIC0tPnxZZXN8IERbKER5bmFtb0RCIGluY2lkZW50cyBhbmQgaG90c3BvdHMpXQogICAgRCAtLT4gTShbSGF6YXJkIGxheWVyIG9uIHRoZSBtYXBdKQogICAgT0sgLS0-fFJldHJpZXMgZXhoYXVzdGVkfCBYW1tEZWFkLWxldHRlciBxdWV1ZV1dCiAgICBYIC0tPiBBW0Nsb3VkV2F0Y2ggYWxhcm1dCiAgICBBIC0tPiBPKFtPcGVyYXRvciByZXZpZXddKQogICAgY2xhc3MgUixBUEksVixRLFAsRCxNLE8gYXdzCiAgICBjbGFzcyBPSyBob3QKICAgIGNsYXNzIFgsQSBhbGVydAogICAgY2xhc3NEZWYgYXdzIGZpbGw6IzIzMkYzRSxzdHJva2U6I0ZGOTkwMCxzdHJva2Utd2lkdGg6MnB4LGNvbG9yOiNGRkZGRkYKICAgIGNsYXNzRGVmIGhvdCBmaWxsOiNGRjk5MDAsc3Ryb2tlOiMyMzJGM0Usc3Ryb2tlLXdpZHRoOjJweCxjb2xvcjojMjMyRjNFCiAgICBjbGFzc0RlZiBhbGVydCBmaWxsOiNCOTFDMUMsc3Ryb2tlOiNGQ0E1QTUsc3Ryb2tlLXdpZHRoOjJweCxjb2xvcjojRkZGRkZGCiAgICBsaW5rU3R5bGUgZGVmYXVsdCBzdHJva2U6I0ZGOTkwMCxzdHJva2Utd2lkdGg6MnB4Cg==?type=png&bgColor=0d1117" alt="Flowchart of the hazard report pipeline with SQS retries and dead-letter queue alarm">
</p>

## Built on AWS

<p align="center">
  <img src="https://media.agentgif.com/Oezh4wEg.gif" alt="AWS CLI terminal demo" width="720">
</p>

<p align="center"><sub>AWS CLI in action</sub></p>

<div align="center">
<table>
  <thead>
    <tr>
      <th align="left">Service</th>
      <th align="left">Intended role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://img.shields.io/badge/AWS_Lambda-FF9900?style=flat-square&logo=awslambda&logoColor=white" alt="AWS Lambda"></td>
      <td>Execute backend operations</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/API_Gateway-FF4F8B?style=flat-square&logo=amazonapigateway&logoColor=white" alt="API Gateway"></td>
      <td>Expose HTTP API endpoints</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/DynamoDB-4053D6?style=flat-square&logo=amazondynamodb&logoColor=white" alt="DynamoDB"></td>
      <td>Store incident and hotspot data</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/Amazon_SQS-FF4F8B?style=flat-square&logo=amazonsqs&logoColor=white" alt="Amazon SQS"></td>
      <td>Support asynchronous processing</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/SQS_Dead_Letter_Queue-B91C1C?style=flat-square&logo=amazonsqs&logoColor=white" alt="SQS Dead Letter Queue"></td>
      <td>Isolate messages that cannot be processed</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/Cognito-DD344C?style=flat-square&logo=amazoncognito&logoColor=white" alt="Cognito"></td>
      <td>Support user authentication</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/Amazon_S3-3F8624?style=flat-square&logo=amazons3&logoColor=white" alt="Amazon S3"></td>
      <td>Host static frontend assets</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/CloudFront-8C4FFF?style=flat-square&logo=amazonaws&logoColor=white" alt="CloudFront"></td>
      <td>Optional content delivery</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/CloudWatch-E7157B?style=flat-square&logo=amazoncloudwatch&logoColor=white" alt="CloudWatch"></td>
      <td>Logs, metrics, and alarms</td>
    </tr>
    <tr>
      <td><img src="https://img.shields.io/badge/SageMaker-01A88D?style=flat-square&logo=amazonaws&logoColor=white" alt="SageMaker"></td>
      <td>Optional machine-learning scoring</td>
    </tr>
  </tbody>
</table>
</div>

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white" alt="Mapbox">
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=FF9900" alt="AWS">
</p>

## Getting Started

<details>
<summary><strong>Prerequisites</strong></summary>

<br>

- Node.js compatible with the project's dependencies
- npm
- Git
- Environment variables for any external services used

</details>

<details open>
<summary><strong>Clone and install</strong></summary>

<br>

```bash
git clone https://github.com/CyberCodezilla/ENV-entors.git
cd ENV-entors
npm install
```

Inspect the root package configuration and follow its workspace setup. The install command above assumes npm workspaces.

</details>

<details>
<summary><strong>Configure environment variables</strong></summary>

<br>

Create the environment file required by the web application and set the keys for mapping and any connected services.

**Caution:** never commit API secrets, AWS credentials, access tokens, or other sensitive values.

</details>

<details>
<summary><strong>Run locally</strong></summary>

<br>

```bash
npm run dev
```

This assumes the root package exposes a `dev` script. Check the repository's actual scripts before running commands.

</details>

<details>
<summary><strong>Repository structure</strong></summary>

<br>

Exact paths may vary as the project evolves.

```text
ENV-entors/
├── apps/
│   └── web/
│       └── src/
│           └── app/
│               ├── page.tsx
│               └── globals.css
├── infrastructure/
│   └── AWS deployment configuration
├── services/
│   └── Backend functions and application services
└── README.md
```

</details>

## Responsible Use

HeatFlood Guardian is a prototype for environmental route-risk exploration and demonstration. Its outputs may rely on simulated scenarios, configured data sources, or fallback behavior. It is not an emergency-response service and cannot guarantee that any route is safe. For urgent situations, follow official local warnings and instructions from emergency services.

- Treat environmental risk indicators as decision-support information.
- Do not interpret a simulated incident as a live emergency notification.
- Verify important travel conditions with reliable, current local information.
- Keep credentials and secrets out of source control.
- Validate backend configuration before relying on deployment health indicators.

**Evidence labels the project aims to keep distinct**

| Label | Meaning |
|---|---|
| Live | Real sensor or API data |
| Configured | Data from a configured source |
| Simulated | Produced by a demonstration scenario |
| Fallback | Default logic used when a source is unavailable |

## Roadmap

<p align="center">
  <img src="https://mermaid.ink/img/JSV7aW5pdDp7J3RoZW1lJzonZGFyaycsJ3RoZW1lVmFyaWFibGVzJzp7J3ByaW1hcnlDb2xvcic6JyMyMzJGM0UnLCdwcmltYXJ5Qm9yZGVyQ29sb3InOicjRkY5OTAwJywnbGluZUNvbG9yJzonI0ZGOTkwMCd9fX0lJQp0aW1lbGluZQogICAgdGl0bGUgV2hlcmUgSGVhdEZsb29kIEd1YXJkaWFuIGlzIGhlYWRpbmcKICAgIE5vdyA6IEludGVyYWN0aXZlIG1hcCBhbmQgcm91dGUgY29tcGFyaXNvbiA6IEhlYXQgYW5kIGZsb29kIGluZGljYXRvcnMgOiBTY2VuYXJpbyBzaW11bGF0aW9uIDogQ29tbXVuaXR5IGhhemFyZCByZXBvcnRpbmcKICAgIE5leHQgOiBWZXJpZmllZCByZWFsLXRpbWUgZW52aXJvbm1lbnRhbCBhbmQgZmxvb2QgZGF0YSA6IEJldHRlciByaXNrIGNhbGlicmF0aW9uIGFuZCBleHBsYWluYWJpbGl0eSA6IFRpbWVzdGFtcHMgYW5kIHByb3ZlbmFuY2UgZm9yIGV2aWRlbmNlCiAgICBMYXRlciA6IFZhbGlkYXRlIGFsdGVybmF0aXZlcyBhZ2FpbnN0IGN1cnJlbnQgY29uZGl0aW9ucyA6IEF1dG9tYXRlZCB0ZXN0cyBhbmQgZGVwbG95bWVudCBjaGVja3MgOiBBY2Nlc3NpYmlsaXR5IGFuZCBtb2JpbGUgdXNhYmlsaXR5IDogQmV0dGVyIG1vbml0b3JpbmcgYW5kIGluY2lkZW50LWRhdGEgcXVhbGl0eQo=?type=png&bgColor=0d1117" alt="Roadmap timeline: now, next, later">
</p>

## Team

| Member | Role |
|---|---|
| Yash | Team Leader |
| Sahil | Team Member |
| Anurag | Team Member |

<div align="center">

<br>

<a href="http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com">
  <img src="https://img.shields.io/badge/Launch-HeatFlood_Guardian-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white&labelColor=232F3E" alt="Launch HeatFlood Guardian">
</a>

<br><br>

<a href="http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com">http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com</a>

<br><br>

<a href="https://github.com/CyberCodezilla/ENV-entors">https://github.com/CyberCodezilla/ENV-entors</a>

<br><br>

<strong>Built to make urban environmental risks easier to understand.</strong>

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:232F3E,100:FF9900&height=120&section=footer" width="100%" alt="">
